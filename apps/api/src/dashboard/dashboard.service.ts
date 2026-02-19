import { Injectable } from '@nestjs/common';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import {
  clients,
  locations,
  assets,
  renditions,
  jurisdictions,
} from '../database/schema';

@Injectable()
export class DashboardService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async getStats(firmId: string, taxYear?: number) {
    const currentTaxYear = taxYear ?? new Date().getFullYear();

    // Run counts and rendition breakdown in parallel
    const [
      clientCountResult,
      locationCountResult,
      assetCountResult,
      renditionStatusRows,
      deadlineRows,
    ] = await Promise.all([
      // Client count
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(and(eq(clients.firmId, firmId), isNull(clients.deletedAt))),

      // Location count (join through clients for firm scoping)
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(locations)
        .innerJoin(clients, eq(locations.clientId, clients.id))
        .where(
          and(
            eq(clients.firmId, firmId),
            isNull(clients.deletedAt),
            isNull(locations.deletedAt),
          ),
        ),

      // Asset count (join through locations → clients)
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(assets)
        .innerJoin(locations, eq(assets.locationId, locations.id))
        .innerJoin(clients, eq(locations.clientId, clients.id))
        .where(
          and(
            eq(clients.firmId, firmId),
            isNull(clients.deletedAt),
            isNull(locations.deletedAt),
            isNull(assets.deletedAt),
          ),
        ),

      // Renditions grouped by status (current tax year)
      this.db
        .select({
          status: renditions.status,
          count: sql<number>`count(*)::int`,
        })
        .from(renditions)
        .innerJoin(locations, eq(renditions.locationId, locations.id))
        .innerJoin(clients, eq(locations.clientId, clients.id))
        .where(
          and(
            eq(clients.firmId, firmId),
            isNull(clients.deletedAt),
            isNull(locations.deletedAt),
            eq(renditions.taxYear, currentTaxYear),
          ),
        )
        .groupBy(renditions.status),

      // Upcoming deadlines: locations with un-filed renditions that have jurisdictions with deadlines
      this.db
        .select({
          county: jurisdictions.county,
          state: jurisdictions.state,
          filingDeadline: jurisdictions.filingDeadline,
          extensionDeadline: jurisdictions.extensionDeadline,
          locationCount: sql<number>`count(distinct ${locations.id})::int`,
        })
        .from(renditions)
        .innerJoin(locations, eq(renditions.locationId, locations.id))
        .innerJoin(clients, eq(locations.clientId, clients.id))
        .innerJoin(jurisdictions, eq(renditions.jurisdictionId, jurisdictions.id))
        .where(
          and(
            eq(clients.firmId, firmId),
            isNull(clients.deletedAt),
            isNull(locations.deletedAt),
            eq(renditions.taxYear, currentTaxYear),
            sql`${renditions.status} != 'filed'`,
          ),
        )
        .groupBy(
          jurisdictions.county,
          jurisdictions.state,
          jurisdictions.filingDeadline,
          jurisdictions.extensionDeadline,
        )
        .orderBy(jurisdictions.filingDeadline)
        .limit(10),
    ]);

    // Build renditions by status map
    const renditionsByStatus: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      review: 0,
      approved: 0,
      filed: 0,
    };
    for (const row of renditionStatusRows) {
      renditionsByStatus[row.status] = row.count;
    }

    // Calculate days until deadline for each
    const today = new Date();
    const upcomingDeadlines = deadlineRows
      .filter((row) => row.filingDeadline)
      .map((row) => {
        const deadline = new Date(`${currentTaxYear}-${row.filingDeadline!.slice(5)}`);
        const daysLeft = Math.ceil(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          county: row.county,
          state: row.state,
          deadline: deadline.toISOString().split('T')[0],
          daysLeft,
          locationCount: row.locationCount,
        };
      });

    return {
      clientCount: clientCountResult[0].count,
      locationCount: locationCountResult[0].count,
      assetCount: assetCountResult[0].count,
      renditionsByStatus,
      currentTaxYear,
      upcomingDeadlines,
    };
  }
}
