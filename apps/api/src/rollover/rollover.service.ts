import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import {
  assets,
  assetSnapshots,
  locations,
  clients,
  renditions,
} from '../database/schema';

@Injectable()
export class RolloverService {
  private readonly logger = new Logger(RolloverService.name);

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  /**
   * Roll assets forward from one tax year to the next.
   *
   * 1. Creates asset_snapshots for all non-disposed assets in the firm for toYear
   * 2. Creates renditions (status: not_started) for each location with assets
   *
   * Assets are immutable per tax year: editing an asset after rollover
   * does NOT change the snapshot. The depreciation engine reads snapshots
   * for a given tax year (or falls back to live assets for the current year).
   */
  async rolloverToYear(
    firmId: string,
    fromYear: number,
    toYear: number,
  ): Promise<{
    snapshotsCreated: number;
    renditionsCreated: number;
    locationsProcessed: number;
  }> {
    if (toYear <= fromYear) {
      throw new BadRequestException(
        `Target year (${toYear}) must be greater than source year (${fromYear}).`,
      );
    }

    // Check if rollover already done for toYear
    const existingSnapshots = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetSnapshots)
      .innerJoin(assets, eq(assetSnapshots.assetId, assets.id))
      .innerJoin(locations, eq(assets.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .where(
        and(
          eq(clients.firmId, firmId),
          eq(assetSnapshots.taxYear, toYear),
        ),
      );

    if (existingSnapshots[0]?.count > 0) {
      throw new ConflictException(
        `Rollover to ${toYear} has already been performed. ${existingSnapshots[0].count} snapshots exist.`,
      );
    }

    // Load all non-disposed assets for the firm
    const firmAssets = await this.db
      .select({
        assetId: assets.id,
        locationId: assets.locationId,
        description: assets.description,
        category: assets.category,
        originalCost: assets.originalCost,
        acquisitionDate: assets.acquisitionDate,
        quantity: assets.quantity,
        isLeased: assets.isLeased,
        lessorName: assets.lessorName,
        lessorAddress: assets.lessorAddress,
        disposalDate: assets.disposalDate,
        jurisdictionId: locations.jurisdictionId,
      })
      .from(assets)
      .innerJoin(locations, eq(assets.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .where(
        and(
          eq(clients.firmId, firmId),
          isNull(assets.deletedAt),
          isNull(locations.deletedAt),
          isNull(clients.deletedAt),
        ),
      );

    // Filter out disposed assets (disposed before Jan 1 of toYear)
    const activeAssets = firmAssets.filter((a) => {
      if (!a.disposalDate) return true;
      return new Date(a.disposalDate) >= new Date(`${toYear}-01-01`);
    });

    if (activeAssets.length === 0) {
      throw new BadRequestException(
        'No active assets found to roll over. Ensure assets exist and are not disposed.',
      );
    }

    // Create snapshots
    const snapshotValues = activeAssets.map((a) => ({
      assetId: a.assetId,
      taxYear: toYear,
      description: a.description,
      category: a.category,
      originalCost: a.originalCost,
      acquisitionDate: a.acquisitionDate,
      quantity: a.quantity,
      isLeased: a.isLeased,
      lessorName: a.lessorName,
      lessorAddress: a.lessorAddress,
    }));

    // Insert snapshots in batches
    let snapshotsCreated = 0;
    const batchSize = 100;
    for (let i = 0; i < snapshotValues.length; i += batchSize) {
      const batch = snapshotValues.slice(i, i + batchSize);
      const result = await this.db
        .insert(assetSnapshots)
        .values(batch)
        .returning({ id: assetSnapshots.id });
      snapshotsCreated += result.length;
    }

    // Create renditions for each unique location that has assets
    const locationMap = new Map<string, string | null>();
    for (const a of activeAssets) {
      if (!locationMap.has(a.locationId)) {
        locationMap.set(a.locationId, a.jurisdictionId);
      }
    }

    let renditionsCreated = 0;
    for (const [locationId, jurisdictionId] of locationMap) {
      // Check if rendition already exists for this location + toYear
      const existing = await this.db
        .select({ id: renditions.id })
        .from(renditions)
        .where(
          and(
            eq(renditions.locationId, locationId),
            eq(renditions.taxYear, toYear),
          ),
        )
        .limit(1);

      if (existing.length > 0) continue;

      if (!jurisdictionId) continue;

      await this.db.insert(renditions).values({
        locationId,
        jurisdictionId,
        taxYear: toYear,
        status: 'not_started',
      });

      renditionsCreated++;
    }

    this.logger.log(
      `Rollover ${fromYear}→${toYear}: ${snapshotsCreated} snapshots, ${renditionsCreated} renditions, ${locationMap.size} locations`,
    );

    return {
      snapshotsCreated,
      renditionsCreated,
      locationsProcessed: locationMap.size,
    };
  }

  async getRolloverStatus(firmId: string, taxYear: number) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetSnapshots)
      .innerJoin(assets, eq(assetSnapshots.assetId, assets.id))
      .innerJoin(locations, eq(assets.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .where(
        and(
          eq(clients.firmId, firmId),
          eq(assetSnapshots.taxYear, taxYear),
        ),
      );

    return {
      taxYear,
      snapshotCount: result?.count ?? 0,
      rolledOver: (result?.count ?? 0) > 0,
    };
  }
}
