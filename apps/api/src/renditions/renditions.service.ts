import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { renditions, locations, clients, jurisdictions } from '../database/schema';
import { DepreciationService, CalculationResult } from '../depreciation/depreciation.service';

/** Valid status transitions: current → allowed next states */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  not_started: ['in_progress'],
  in_progress: ['review'],
  review: ['approved', 'in_progress'],
  approved: ['filed', 'review'],
  filed: [],
};

@Injectable()
export class RenditionsService {
  constructor(
    @InjectDrizzle() private db: DrizzleDB,
    private readonly depreciationService: DepreciationService,
  ) {}

  async create(
    firmId: string,
    clientId: string,
    locationId: string,
    taxYear: number,
  ) {
    // Verify location ownership and get jurisdiction
    const locationData = await this.verifyLocationOwnership(firmId, clientId, locationId);

    if (!locationData.jurisdictionId) {
      throw new BadRequestException(
        'Location must have a jurisdiction assigned before creating a rendition.',
      );
    }

    // Check for duplicate rendition (same location + tax year)
    const existing = await this.db
      .select({ id: renditions.id })
      .from(renditions)
      .where(
        and(
          eq(renditions.locationId, locationId),
          eq(renditions.taxYear, taxYear),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(
        `A rendition for tax year ${taxYear} already exists for this location.`,
      );
    }

    // Create rendition as not_started
    const [rendition] = await this.db
      .insert(renditions)
      .values({
        locationId,
        jurisdictionId: locationData.jurisdictionId,
        taxYear,
        status: 'not_started',
      })
      .returning();

    // Immediately calculate and update to in_progress
    const calculation = await this.depreciationService.calculateForLocation(
      firmId,
      clientId,
      locationId,
      taxYear,
    );

    const [updated] = await this.db
      .update(renditions)
      .set({
        status: 'in_progress',
        calculatedTotals: calculation as unknown as Record<string, unknown>,
      })
      .where(eq(renditions.id, rendition.id))
      .returning();

    return updated;
  }

  async findAllForLocation(firmId: string, clientId: string, locationId: string) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    return this.db
      .select()
      .from(renditions)
      .where(eq(renditions.locationId, locationId))
      .orderBy(renditions.taxYear);
  }

  async findOne(firmId: string, clientId: string, locationId: string, renditionId: string) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    const [rendition] = await this.db
      .select()
      .from(renditions)
      .where(
        and(
          eq(renditions.id, renditionId),
          eq(renditions.locationId, locationId),
        ),
      )
      .limit(1);

    if (!rendition) {
      throw new NotFoundException('Rendition not found');
    }

    return rendition;
  }

  async recalculate(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
  ) {
    const rendition = await this.findOne(firmId, clientId, locationId, renditionId);

    if (rendition.status === 'filed') {
      throw new BadRequestException('Cannot recalculate a filed rendition.');
    }

    const calculation = await this.depreciationService.calculateForLocation(
      firmId,
      clientId,
      locationId,
      rendition.taxYear,
    );

    const [updated] = await this.db
      .update(renditions)
      .set({
        status: 'in_progress',
        calculatedTotals: calculation as unknown as Record<string, unknown>,
      })
      .where(eq(renditions.id, renditionId))
      .returning();

    return updated;
  }

  async updateStatus(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
    newStatus: string,
    userId?: string,
  ) {
    const rendition = await this.findOne(firmId, clientId, locationId, renditionId);

    const allowed = STATUS_TRANSITIONS[rendition.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${rendition.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus as typeof rendition.status,
    };

    // If transitioning to 'filed', record who and when
    if (newStatus === 'filed' && userId) {
      updateData.filedBy = userId;
      updateData.filedAt = new Date();
    }

    const [updated] = await this.db
      .update(renditions)
      .set(updateData)
      .where(eq(renditions.id, renditionId))
      .returning();

    return updated;
  }

  async remove(firmId: string, clientId: string, locationId: string, renditionId: string) {
    const rendition = await this.findOne(firmId, clientId, locationId, renditionId);

    if (rendition.status === 'filed') {
      throw new BadRequestException('Cannot delete a filed rendition.');
    }

    await this.db.delete(renditions).where(eq(renditions.id, renditionId));

    return { deleted: true };
  }

  /**
   * Firm-wide rendition listing — intentionally NOT nested under /clients or /locations.
   * This is a dashboard aggregate query that joins across the ownership chain.
   */
  async findAllForFirm(firmId: string, filters?: { taxYear?: number; status?: string }) {
    const rows = await this.db
      .select({
        id: renditions.id,
        locationId: renditions.locationId,
        jurisdictionId: renditions.jurisdictionId,
        taxYear: renditions.taxYear,
        status: renditions.status,
        calculatedTotals: renditions.calculatedTotals,
        pdfUrl: renditions.pdfUrl,
        filedBy: renditions.filedBy,
        filedAt: renditions.filedAt,
        createdAt: renditions.createdAt,
        updatedAt: renditions.updatedAt,
        locationName: locations.name,
        clientId: clients.id,
        companyName: clients.companyName,
        county: jurisdictions.county,
        state: jurisdictions.state,
      })
      .from(renditions)
      .innerJoin(locations, eq(renditions.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .leftJoin(jurisdictions, eq(renditions.jurisdictionId, jurisdictions.id))
      .where(
        and(
          eq(clients.firmId, firmId),
          isNull(locations.deletedAt),
          isNull(clients.deletedAt),
          filters?.taxYear ? eq(renditions.taxYear, filters.taxYear) : undefined,
          filters?.status
            ? eq(renditions.status, filters.status as typeof renditions.$inferSelect.status)
            : undefined,
        ),
      )
      .orderBy(renditions.createdAt);

    return rows;
  }

  private async verifyLocationOwnership(firmId: string, clientId: string, locationId: string) {
    const result = await this.db
      .select({
        id: locations.id,
        jurisdictionId: locations.jurisdictionId,
      })
      .from(locations)
      .innerJoin(clients, eq(locations.clientId, clients.id))
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

    return result[0];
  }
}
