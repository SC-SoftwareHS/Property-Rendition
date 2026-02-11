import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import {
  assets,
  locations,
  clients,
  jurisdictions,
  depreciationSchedules,
} from '../database/schema';

/**
 * Category → PTAD Economic Life mapping.
 * inventory/supplies always report at 100% (full cost).
 */
const TX_ECONOMIC_LIFE: Record<string, number> = {
  computer_equipment: 5,
  furniture_fixtures: 10,
  machinery_equipment: 12,
  leasehold_improvements: 15,
  vehicles: 6,
  inventory: 1,
  supplies: 1,
  leased_equipment: 10,
  other: 10,
};

export interface AssetCalculation {
  assetId: string;
  description: string;
  category: string;
  originalCost: number;
  acquisitionYear: number;
  yearOfLife: number;
  percentGood: number;
  depreciatedValue: number;
  quantity: number;
  isLeased: boolean;
}

export interface CategoryYearGroup {
  acquisitionYear: number;
  originalCost: number;
  depreciatedValue: number;
  percentGood: number;
  yearOfLife: number;
  assetCount: number;
}

export interface CategorySummary {
  totalOriginalCost: number;
  totalDepreciatedValue: number;
  assetCount: number;
  byYear: Record<number, CategoryYearGroup>;
}

export interface CalculationResult {
  taxYear: number;
  state: string;
  calculatedAt: string;
  byCategory: Record<string, CategorySummary>;
  grandTotalOriginalCost: number;
  grandTotalDepreciatedValue: number;
  totalAssetCount: number;
  assets: AssetCalculation[];
}

@Injectable()
export class DepreciationService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async calculateForLocation(
    firmId: string,
    clientId: string,
    locationId: string,
    taxYear: number,
  ): Promise<CalculationResult> {
    // 1. Verify ownership and load location with jurisdiction
    const locationData = await this.verifyAndLoadLocation(firmId, clientId, locationId);

    if (!locationData.state) {
      throw new BadRequestException(
        'Location has no state assigned. Set the location state or jurisdiction before calculating.',
      );
    }

    const state = locationData.state;

    // 2. Load all depreciation schedule rows for the state
    const scheduleRows = await this.db
      .select({
        category: depreciationSchedules.category,
        yearOfLife: depreciationSchedules.yearOfLife,
        depreciationPercent: depreciationSchedules.depreciationPercent,
      })
      .from(depreciationSchedules)
      .where(eq(depreciationSchedules.state, state));

    if (scheduleRows.length === 0) {
      throw new BadRequestException(
        `No depreciation schedule found for state ${state}. Ensure seed data has been loaded.`,
      );
    }

    // Build lookup: Map<category, Map<yearOfLife, percentGood>>
    const scheduleMap = new Map<string, Map<number, number>>();
    for (const row of scheduleRows) {
      if (!scheduleMap.has(row.category)) {
        scheduleMap.set(row.category, new Map());
      }
      scheduleMap.get(row.category)!.set(
        row.yearOfLife,
        parseFloat(row.depreciationPercent),
      );
    }

    // 3. Load all non-deleted assets for the location
    const locationAssets = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.locationId, locationId),
          isNull(assets.deletedAt),
        ),
      );

    // 4. Calculate depreciated values
    const assetCalculations: AssetCalculation[] = [];
    const byCategory: Record<string, CategorySummary> = {};
    let grandTotalOriginalCost = 0;
    let grandTotalDepreciatedValue = 0;
    let totalAssetCount = 0;

    for (const asset of locationAssets) {
      const acquisitionYear = new Date(asset.acquisitionDate).getFullYear();

      // Skip disposed assets (disposed before Jan 1 of tax year)
      if (asset.disposalDate) {
        const disposalDate = new Date(asset.disposalDate);
        if (disposalDate < new Date(`${taxYear}-01-01`)) {
          continue;
        }
      }

      const category = asset.category;
      const originalCost = parseFloat(asset.originalCost) * (asset.quantity ?? 1);
      const yearOfLife = Math.max(1, taxYear - acquisitionYear + 1);

      // Look up percent good
      let percentGood: number;
      if (category === 'inventory' || category === 'supplies') {
        percentGood = 100;
      } else {
        const categorySchedule = scheduleMap.get(category);
        if (categorySchedule) {
          if (categorySchedule.has(yearOfLife)) {
            percentGood = categorySchedule.get(yearOfLife)!;
          } else {
            // Beyond max year — use the floor (last entry's value)
            const maxYear = Math.max(...categorySchedule.keys());
            percentGood = yearOfLife > maxYear
              ? categorySchedule.get(maxYear)!
              : categorySchedule.get(1)!; // shouldn't happen, but safe fallback
          }
        } else {
          // No schedule for this category — use 100% as safe default
          percentGood = 100;
        }
      }

      const depreciatedValue = Math.round(originalCost * (percentGood / 100) * 100) / 100;

      assetCalculations.push({
        assetId: asset.id,
        description: asset.description,
        category,
        originalCost,
        acquisitionYear,
        yearOfLife,
        percentGood,
        depreciatedValue,
        quantity: asset.quantity ?? 1,
        isLeased: asset.isLeased ?? false,
      });

      // Aggregate by category
      if (!byCategory[category]) {
        byCategory[category] = {
          totalOriginalCost: 0,
          totalDepreciatedValue: 0,
          assetCount: 0,
          byYear: {},
        };
      }

      const catSummary = byCategory[category];
      catSummary.totalOriginalCost += originalCost;
      catSummary.totalDepreciatedValue += depreciatedValue;
      catSummary.assetCount += 1;

      // Group by acquisition year within category
      if (!catSummary.byYear[acquisitionYear]) {
        catSummary.byYear[acquisitionYear] = {
          acquisitionYear,
          originalCost: 0,
          depreciatedValue: 0,
          percentGood,
          yearOfLife,
          assetCount: 0,
        };
      }

      const yearGroup = catSummary.byYear[acquisitionYear];
      yearGroup.originalCost += originalCost;
      yearGroup.depreciatedValue += depreciatedValue;
      yearGroup.assetCount += 1;

      grandTotalOriginalCost += originalCost;
      grandTotalDepreciatedValue += depreciatedValue;
      totalAssetCount += 1;
    }

    // Round the aggregated totals to 2 decimal places
    grandTotalOriginalCost = Math.round(grandTotalOriginalCost * 100) / 100;
    grandTotalDepreciatedValue = Math.round(grandTotalDepreciatedValue * 100) / 100;

    for (const cat of Object.values(byCategory)) {
      cat.totalOriginalCost = Math.round(cat.totalOriginalCost * 100) / 100;
      cat.totalDepreciatedValue = Math.round(cat.totalDepreciatedValue * 100) / 100;
      for (const yr of Object.values(cat.byYear)) {
        yr.originalCost = Math.round(yr.originalCost * 100) / 100;
        yr.depreciatedValue = Math.round(yr.depreciatedValue * 100) / 100;
      }
    }

    return {
      taxYear,
      state,
      calculatedAt: new Date().toISOString(),
      byCategory,
      grandTotalOriginalCost,
      grandTotalDepreciatedValue,
      totalAssetCount,
      assets: assetCalculations,
    };
  }

  private async verifyAndLoadLocation(
    firmId: string,
    clientId: string,
    locationId: string,
  ) {
    const result = await this.db
      .select({
        id: locations.id,
        jurisdictionId: locations.jurisdictionId,
        state: locations.state,
        jurisdictionState: jurisdictions.state,
      })
      .from(locations)
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .leftJoin(jurisdictions, eq(locations.jurisdictionId, jurisdictions.id))
      .where(
        and(
          eq(locations.id, locationId),
          eq(locations.clientId, clientId),
          eq(clients.firmId, firmId),
          isNull(locations.deletedAt),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new ForbiddenException('Location not found or access denied');
    }

    const loc = result[0];
    // Prefer jurisdiction state over location state (jurisdiction is authoritative)
    return {
      id: loc.id,
      jurisdictionId: loc.jurisdictionId,
      state: loc.jurisdictionState ?? loc.state,
    };
  }
}
