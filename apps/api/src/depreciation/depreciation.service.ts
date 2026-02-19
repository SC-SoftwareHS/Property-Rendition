import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import {
  assets,
  assetSnapshots,
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
  office_equipment: 10,
  medical_equipment: 8,
  restaurant_equipment: 8,
  telecommunications: 5,
  software: 3,
  tools_dies: 7,
  signs_displays: 7,
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
  isOverridden?: boolean;
  overrideValue?: number;
  originalDepreciatedValue?: number;
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

/**
 * HB 9 exemption metadata (TX only, effective Jan 1, 2026).
 * $125K deduction from appraised BPP value per location per taxing unit.
 */
export interface Hb9Exemption {
  /** The statutory exemption amount ($125,000) */
  exemptionAmount: number;
  /** Whether this location's total value is at or below the threshold */
  isExempt: boolean;
  /** Whether owner has related business entities at the same address */
  hasRelatedEntities: boolean;
  /** Whether business elects not to render (under-$125K one-time certification) */
  electNotToRender: boolean;
  /** Value after exemption: max(0, grandTotalDepreciatedValue - 125000) */
  netTaxableValue: number;
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
  /** HB 9 exemption info (TX only, tax year >= 2026) */
  hb9?: Hb9Exemption;
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

  /**
   * Calculate depreciation using asset_snapshots for a given tax year.
   * If no snapshots exist for the tax year, falls back to live assets.
   *
   * This is used after year-over-year rollover: snapshots freeze asset data
   * so editing an asset doesn't change prior-year renditions.
   */
  async calculateFromSnapshots(
    firmId: string,
    clientId: string,
    locationId: string,
    taxYear: number,
  ): Promise<CalculationResult> {
    // Check if snapshots exist for this location + tax year
    const snapshotCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetSnapshots)
      .innerJoin(assets, eq(assetSnapshots.assetId, assets.id))
      .where(
        and(
          eq(assets.locationId, locationId),
          eq(assetSnapshots.taxYear, taxYear),
        ),
      );

    if ((snapshotCount[0]?.count ?? 0) === 0) {
      // No snapshots — fall back to live assets
      return this.calculateForLocation(firmId, clientId, locationId, taxYear);
    }

    // Verify ownership and load location
    const locationData = await this.verifyAndLoadLocation(firmId, clientId, locationId);

    if (!locationData.state) {
      throw new BadRequestException(
        'Location has no state assigned. Set the location state or jurisdiction before calculating.',
      );
    }

    const state = locationData.state;

    // Load depreciation schedule
    const scheduleMap = await this.loadScheduleMap(state);

    // Load snapshots for this location + tax year
    const snapshots = await this.db
      .select({
        assetId: assetSnapshots.assetId,
        description: assetSnapshots.description,
        category: assetSnapshots.category,
        originalCost: assetSnapshots.originalCost,
        acquisitionDate: assetSnapshots.acquisitionDate,
        quantity: assetSnapshots.quantity,
        isLeased: assetSnapshots.isLeased,
      })
      .from(assetSnapshots)
      .innerJoin(assets, eq(assetSnapshots.assetId, assets.id))
      .where(
        and(
          eq(assets.locationId, locationId),
          eq(assetSnapshots.taxYear, taxYear),
          isNull(assets.deletedAt),
        ),
      );

    // Calculate using snapshots (same logic as live assets)
    return this.calculateFromAssetData(
      snapshots.map((s) => ({
        id: s.assetId,
        description: s.description,
        category: s.category,
        originalCost: s.originalCost,
        acquisitionDate: s.acquisitionDate,
        quantity: s.quantity,
        isLeased: s.isLeased,
        disposalDate: null,
      })),
      taxYear,
      state,
      scheduleMap,
    );
  }

  /**
   * Load the depreciation schedule for a state and build the lookup map.
   */
  private async loadScheduleMap(
    state: string,
  ): Promise<Map<string, Map<number, number>>> {
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

    return scheduleMap;
  }

  /**
   * Core depreciation calculation logic shared by live-asset and snapshot paths.
   */
  private calculateFromAssetData(
    assetData: {
      id: string;
      description: string;
      category: string;
      originalCost: string;
      acquisitionDate: string;
      quantity: number;
      isLeased: boolean;
      disposalDate: string | null;
    }[],
    taxYear: number,
    state: string,
    scheduleMap: Map<string, Map<number, number>>,
  ): CalculationResult {
    const assetCalculations: AssetCalculation[] = [];
    const byCategory: Record<string, CategorySummary> = {};
    let grandTotalOriginalCost = 0;
    let grandTotalDepreciatedValue = 0;
    let totalAssetCount = 0;

    for (const asset of assetData) {
      const acquisitionYear = new Date(asset.acquisitionDate).getFullYear();

      // Skip disposed assets
      if (asset.disposalDate) {
        const disposalDate = new Date(asset.disposalDate);
        if (disposalDate < new Date(`${taxYear}-01-01`)) {
          continue;
        }
      }

      const category = asset.category;
      const originalCost = parseFloat(asset.originalCost) * (asset.quantity ?? 1);
      const yearOfLife = Math.max(1, taxYear - acquisitionYear + 1);

      const percentGood = this.lookupPercentGood(category, yearOfLife, scheduleMap);
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

    // Round
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

    const result: CalculationResult = {
      taxYear,
      state,
      calculatedAt: new Date().toISOString(),
      byCategory,
      grandTotalOriginalCost,
      grandTotalDepreciatedValue,
      totalAssetCount,
      assets: assetCalculations,
    };

    // Compute HB 9 exemption for TX locations (effective tax year 2026+)
    if (state === 'TX' && taxYear >= 2026) {
      const HB9_EXEMPTION = 125_000;
      const isExempt = grandTotalDepreciatedValue <= HB9_EXEMPTION;
      result.hb9 = {
        exemptionAmount: HB9_EXEMPTION,
        isExempt,
        hasRelatedEntities: false, // Set by rendition service from user input
        electNotToRender: false, // Set by rendition service from user input
        netTaxableValue: Math.max(0, Math.round((grandTotalDepreciatedValue - HB9_EXEMPTION) * 100) / 100),
      };
    }

    return result;
  }

  /**
   * Look up percent good from the schedule map.
   */
  private lookupPercentGood(
    category: string,
    yearOfLife: number,
    scheduleMap: Map<string, Map<number, number>>,
  ): number {
    if (category === 'inventory' || category === 'supplies') {
      return 100;
    }

    const categorySchedule = scheduleMap.get(category);
    if (!categorySchedule) {
      return 100;
    }

    if (categorySchedule.has(yearOfLife)) {
      return categorySchedule.get(yearOfLife)!;
    }

    // Beyond max year — use the floor (last entry's value)
    const maxYear = Math.max(...categorySchedule.keys());
    return yearOfLife > maxYear
      ? categorySchedule.get(maxYear)!
      : categorySchedule.get(1)!;
  }

  /**
   * Apply FMV overrides to a CalculationResult.
   * Overrides replace per-asset depreciatedValue and recalculate all aggregates.
   * The original calculated value is preserved in `originalDepreciatedValue`.
   */
  static applyOverrides(
    calculation: CalculationResult,
    overrides: Record<string, { overrideValue: number }>,
  ): CalculationResult {
    if (!overrides || Object.keys(overrides).length === 0) {
      return calculation;
    }

    // Deep clone to avoid mutating the original
    const result: CalculationResult = JSON.parse(JSON.stringify(calculation));

    // Apply per-asset overrides
    for (const asset of result.assets) {
      const override = overrides[asset.assetId];
      if (override) {
        asset.originalDepreciatedValue = asset.depreciatedValue;
        asset.depreciatedValue = override.overrideValue;
        asset.isOverridden = true;
        asset.overrideValue = override.overrideValue;
      }
    }

    // Recalculate category summaries from scratch
    const byCategory: Record<string, CategorySummary> = {};
    let grandTotalOriginalCost = 0;
    let grandTotalDepreciatedValue = 0;

    for (const asset of result.assets) {
      if (!byCategory[asset.category]) {
        byCategory[asset.category] = {
          totalOriginalCost: 0,
          totalDepreciatedValue: 0,
          assetCount: 0,
          byYear: {},
        };
      }

      const cat = byCategory[asset.category];
      cat.totalOriginalCost += asset.originalCost;
      cat.totalDepreciatedValue += asset.depreciatedValue;
      cat.assetCount += 1;

      if (!cat.byYear[asset.acquisitionYear]) {
        cat.byYear[asset.acquisitionYear] = {
          acquisitionYear: asset.acquisitionYear,
          originalCost: 0,
          depreciatedValue: 0,
          percentGood: asset.percentGood,
          yearOfLife: asset.yearOfLife,
          assetCount: 0,
        };
      }

      const yr = cat.byYear[asset.acquisitionYear];
      yr.originalCost += asset.originalCost;
      yr.depreciatedValue += asset.depreciatedValue;
      yr.assetCount += 1;

      grandTotalOriginalCost += asset.originalCost;
      grandTotalDepreciatedValue += asset.depreciatedValue;
    }

    // Round
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

    result.byCategory = byCategory;
    result.grandTotalOriginalCost = grandTotalOriginalCost;
    result.grandTotalDepreciatedValue = grandTotalDepreciatedValue;

    // Recalculate HB 9 if applicable
    if (result.hb9) {
      const HB9_EXEMPTION = 125_000;
      result.hb9.isExempt = grandTotalDepreciatedValue <= HB9_EXEMPTION;
      result.hb9.netTaxableValue = Math.max(
        0,
        Math.round((grandTotalDepreciatedValue - HB9_EXEMPTION) * 100) / 100,
      );
    }

    return result;
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
