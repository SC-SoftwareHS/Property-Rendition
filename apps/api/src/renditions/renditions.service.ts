import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { renditions, locations, clients, jurisdictions } from '../database/schema';
import { DepreciationService, CalculationResult } from '../depreciation/depreciation.service';
import { PdfService } from '../pdf/pdf.service';
import { RelatedEntitiesService } from '../related-entities/related-entities.service';
import { BatchRenditionEntry } from '../pdf/strategies/batch-cover-letter.strategy';
import type { FmvOverrideEntry } from '../database/schema/renditions';

/** Valid status transitions: current → allowed next states */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  not_started: ['in_progress'],
  in_progress: ['review'],
  review: ['approved', 'in_progress'],
  approved: ['filed', 'review'],
  filed: [],
};

export interface BatchGenerateResult {
  total: number;
  success: number;
  failed: number;
  results: {
    renditionId: string;
    companyName: string;
    locationName: string;
    filename?: string;
    error?: string;
  }[];
}

@Injectable()
export class RenditionsService {
  private readonly logger = new Logger(RenditionsService.name);

  constructor(
    @InjectDrizzle() private db: DrizzleDB,
    private readonly depreciationService: DepreciationService,
    private readonly pdfService: PdfService,
    private readonly relatedEntitiesService: RelatedEntitiesService,
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

    // Enrich HB 9 data with related entity info
    await this.enrichHb9WithRelatedEntities(calculation, firmId, clientId, taxYear);

    const [updated] = await this.db
      .update(renditions)
      .set({
        status: 'in_progress',
        calculatedTotals: calculation as unknown as Record<string, unknown>,
        ...this.extractHb9Fields(calculation),
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

    // Use calculateFromSnapshots: if snapshots exist for this tax year,
    // reads frozen snapshot data instead of live assets (preserves prior-year accuracy).
    const calculation = await this.depreciationService.calculateFromSnapshots(
      firmId,
      clientId,
      locationId,
      rendition.taxYear,
    );

    // Preserve user-set HB 9 fields (related entities, elect-not-to-render)
    // while recalculating exemption eligibility from new totals
    if (calculation.hb9) {
      calculation.hb9.hasRelatedEntities = rendition.hb9HasRelatedEntities;
      calculation.hb9.electNotToRender = rendition.hb9ElectNotToRender;
    }

    const [updated] = await this.db
      .update(renditions)
      .set({
        status: 'in_progress',
        calculatedTotals: calculation as unknown as Record<string, unknown>,
        ...this.extractHb9Fields(calculation),
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

  /**
   * Batch generate PDFs for approved renditions.
   * Returns a summary with per-rendition success/failure.
   * On success, marks each rendition as 'filed'.
   */
  async batchGenerate(
    firmId: string,
    userId: string,
    dto: { taxYear?: number; renditionIds?: string[] },
  ): Promise<{
    result: BatchGenerateResult;
    pdfBuffers: { filename: string; buffer: Buffer }[];
    scheduleBuffers: { filename: string; buffer: Buffer }[];
    coverLetterEntries: BatchRenditionEntry[];
  }> {
    // Find eligible renditions (approved status, belonging to this firm)
    const eligibleRenditions = await this.findEligibleForBatch(firmId, dto);

    if (eligibleRenditions.length === 0) {
      throw new BadRequestException(
        'No approved renditions found matching the criteria.',
      );
    }

    const result: BatchGenerateResult = {
      total: eligibleRenditions.length,
      success: 0,
      failed: 0,
      results: [],
    };

    const pdfBuffers: { filename: string; buffer: Buffer }[] = [];
    const scheduleBuffers: { filename: string; buffer: Buffer }[] = [];
    const coverLetterEntries: BatchRenditionEntry[] = [];

    // Generate PDFs sequentially (simple loop — BullMQ can replace later)
    for (const r of eligibleRenditions) {
      try {
        const { pdfBytes, filename } = await this.pdfService.generatePdf(
          firmId,
          r.clientId,
          r.locationId,
          r.renditionId,
        );

        // Mark as filed
        await this.db
          .update(renditions)
          .set({
            status: 'filed',
            filedBy: userId,
            filedAt: new Date(),
          })
          .where(eq(renditions.id, r.renditionId));

        result.success++;
        result.results.push({
          renditionId: r.renditionId,
          companyName: r.companyName,
          locationName: r.locationName,
          filename,
        });

        pdfBuffers.push({ filename, buffer: Buffer.from(pdfBytes) });

        // Generate depreciation schedule
        try {
          const schedule = await this.pdfService.generateDepreciationSchedule(
            firmId,
            r.clientId,
            r.locationId,
            r.renditionId,
          );
          scheduleBuffers.push({
            filename: schedule.filename,
            buffer: Buffer.from(schedule.pdfBytes),
          });
        } catch {
          // Non-fatal: skip schedule if it fails
          this.logger.warn(`Batch: schedule generation failed for ${r.companyName}`);
        }

        // Collect cover letter entry
        // Load rendition data for totals
        const [rend] = await this.db
          .select({
            taxYear: renditions.taxYear,
            calculatedTotals: renditions.calculatedTotals,
            county: jurisdictions.county,
            state: jurisdictions.state,
          })
          .from(renditions)
          .leftJoin(jurisdictions, eq(renditions.jurisdictionId, jurisdictions.id))
          .where(eq(renditions.id, r.renditionId))
          .limit(1);

        if (rend) {
          const calc = rend.calculatedTotals as unknown as CalculationResult | null;
          coverLetterEntries.push({
            companyName: r.companyName,
            locationName: r.locationName,
            formName: filename.split('-').slice(0, 3).join(' '),
            accountNumber: undefined,
            county: rend.county ?? '',
            state: rend.state ?? '',
            totalOriginalCost: calc?.grandTotalOriginalCost ?? 0,
            totalDepreciatedValue: calc?.grandTotalDepreciatedValue ?? 0,
            taxYear: rend.taxYear,
            status: 'success',
          });
        }

        this.logger.log(`Batch: generated ${filename}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.failed++;
        result.results.push({
          renditionId: r.renditionId,
          companyName: r.companyName,
          locationName: r.locationName,
          error: message,
        });

        coverLetterEntries.push({
          companyName: r.companyName,
          locationName: r.locationName,
          formName: '',
          county: r.county ?? '',
          state: r.state ?? '',
          totalOriginalCost: 0,
          totalDepreciatedValue: 0,
          taxYear: dto.taxYear ?? new Date().getFullYear(),
          status: 'failed',
          error: message,
        });

        this.logger.warn(`Batch: failed ${r.companyName}/${r.locationName}: ${message}`);
      }
    }

    return { result, pdfBuffers, scheduleBuffers, coverLetterEntries };
  }

  private async findEligibleForBatch(
    firmId: string,
    dto: { taxYear?: number; renditionIds?: string[] },
  ) {
    const conditions = [
      eq(clients.firmId, firmId),
      eq(renditions.status, 'approved'),
      isNull(locations.deletedAt),
      isNull(clients.deletedAt),
    ];

    if (dto.taxYear) {
      conditions.push(eq(renditions.taxYear, dto.taxYear));
    }

    if (dto.renditionIds && dto.renditionIds.length > 0) {
      conditions.push(inArray(renditions.id, dto.renditionIds));
    }

    return this.db
      .select({
        renditionId: renditions.id,
        locationId: renditions.locationId,
        clientId: clients.id,
        companyName: clients.companyName,
        locationName: locations.name,
        county: jurisdictions.county,
        state: jurisdictions.state,
      })
      .from(renditions)
      .innerJoin(locations, eq(renditions.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .leftJoin(jurisdictions, eq(renditions.jurisdictionId, jurisdictions.id))
      .where(and(...conditions));
  }

  /**
   * Update user-controlled HB 9 settings on a rendition.
   * These override calculated defaults (related entities, elect-not-to-render).
   */
  async updateHb9Settings(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
    dto: { hasRelatedEntities?: boolean; electNotToRender?: boolean },
  ) {
    const rendition = await this.findOne(firmId, clientId, locationId, renditionId);

    if (rendition.status === 'filed') {
      throw new BadRequestException('Cannot modify HB 9 settings on a filed rendition.');
    }

    const calculation = rendition.calculatedTotals as unknown as CalculationResult;

    // Validate elect-not-to-render: only allowed when exempt
    if (dto.electNotToRender === true) {
      if (!calculation?.hb9?.isExempt) {
        throw new BadRequestException(
          'Cannot elect not to render — BPP value exceeds $125,000 exemption threshold.',
        );
      }

      // "All or nothing" rule: if related entity group aggregate exceeds $125K,
      // no location in the group can elect not to render
      const aggregation = await this.relatedEntitiesService.computeAggregatedValue(
        firmId,
        clientId,
        rendition.taxYear,
      );

      if (aggregation.isGrouped && aggregation.aggregatedValue > (calculation.hb9?.exemptionAmount ?? 125_000)) {
        throw new BadRequestException(
          `Cannot elect not to render — related entity group "${aggregation.groupName}" ` +
          `has aggregated BPP value of $${Math.round(aggregation.aggregatedValue).toLocaleString()} ` +
          `which exceeds the $125,000 threshold. All locations must render.`,
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.hasRelatedEntities !== undefined) {
      updateData.hb9HasRelatedEntities = dto.hasRelatedEntities;
    }
    if (dto.electNotToRender !== undefined) {
      updateData.hb9ElectNotToRender = dto.electNotToRender;
    }

    // Recalculate exemption status based on new settings
    if (calculation?.hb9) {
      if (dto.hasRelatedEntities !== undefined) {
        calculation.hb9.hasRelatedEntities = dto.hasRelatedEntities;
      }
      if (dto.electNotToRender !== undefined) {
        calculation.hb9.electNotToRender = dto.electNotToRender;
      }
      updateData.calculatedTotals = calculation as unknown as Record<string, unknown>;
    }

    const [updated] = await this.db
      .update(renditions)
      .set(updateData)
      .where(eq(renditions.id, renditionId))
      .returning();

    return updated;
  }

  /**
   * Extract HB 9 fields from a CalculationResult for persisting to the renditions table.
   */
  private extractHb9Fields(calculation: CalculationResult) {
    if (!calculation.hb9) {
      return {};
    }
    return {
      hb9Exempt: calculation.hb9.isExempt,
      hb9HasRelatedEntities: calculation.hb9.hasRelatedEntities,
      hb9ElectNotToRender: calculation.hb9.electNotToRender,
      hb9ExemptionAmount: String(calculation.hb9.exemptionAmount),
      hb9NetTaxableValue: String(calculation.hb9.netTaxableValue),
    };
  }

  /**
   * Check if the client belongs to a related entity group and update the HB 9
   * calculation accordingly. If the group's aggregated BPP value exceeds $125K,
   * the "all or nothing" rule applies — all locations must render.
   */
  private async enrichHb9WithRelatedEntities(
    calculation: CalculationResult,
    firmId: string,
    clientId: string,
    taxYear: number,
  ): Promise<void> {
    if (!calculation.hb9) return;

    const aggregation = await this.relatedEntitiesService.computeAggregatedValue(
      firmId,
      clientId,
      taxYear,
    );

    if (aggregation.isGrouped) {
      calculation.hb9.hasRelatedEntities = true;
      // "All or nothing" rule: if aggregated value > $125K, none are exempt
      if (aggregation.aggregatedValue > calculation.hb9.exemptionAmount) {
        calculation.hb9.isExempt = false;
        calculation.hb9.netTaxableValue = Math.max(
          0,
          Math.round((calculation.grandTotalDepreciatedValue - calculation.hb9.exemptionAmount) * 100) / 100,
        );
      }
    }
  }

  /**
   * Set or update FMV overrides on a rendition.
   * Each override replaces the calculated depreciated value for a specific asset.
   */
  async updateFmvOverrides(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
    overrides: { assetId: string; overrideValue: number; reason: string }[],
    userId: string,
  ) {
    const rendition = await this.findOne(firmId, clientId, locationId, renditionId);

    if (rendition.status === 'filed') {
      throw new BadRequestException('Cannot modify FMV overrides on a filed rendition.');
    }

    // Validate asset IDs belong to this rendition's calculation
    const calc = rendition.calculatedTotals as CalculationResult | null;
    const validAssetIds = new Set(calc?.assets?.map((a) => a.assetId) ?? []);

    for (const o of overrides) {
      if (o.overrideValue < 0) {
        throw new BadRequestException(`Override value must be non-negative for asset ${o.assetId}.`);
      }
      if (validAssetIds.size > 0 && !validAssetIds.has(o.assetId)) {
        throw new NotFoundException(`Asset ${o.assetId} not found in this rendition.`);
      }
    }

    // Merge with existing overrides
    const existing = (rendition.fmvOverrides as Record<string, FmvOverrideEntry>) ?? {};
    const now = new Date().toISOString();

    for (const o of overrides) {
      existing[o.assetId] = {
        overrideValue: o.overrideValue,
        reason: o.reason,
        appliedBy: userId,
        appliedAt: now,
      };
    }

    const [updated] = await this.db
      .update(renditions)
      .set({ fmvOverrides: existing })
      .where(eq(renditions.id, renditionId))
      .returning();

    return updated;
  }

  /**
   * Remove an FMV override for a specific asset on a rendition.
   */
  async removeFmvOverride(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
    assetId: string,
  ) {
    const rendition = await this.findOne(firmId, clientId, locationId, renditionId);

    if (rendition.status === 'filed') {
      throw new BadRequestException('Cannot modify FMV overrides on a filed rendition.');
    }

    const existing = (rendition.fmvOverrides as Record<string, FmvOverrideEntry>) ?? {};

    if (!existing[assetId]) {
      throw new NotFoundException(`No FMV override found for asset ${assetId}.`);
    }

    delete existing[assetId];

    const [updated] = await this.db
      .update(renditions)
      .set({ fmvOverrides: existing })
      .where(eq(renditions.id, renditionId))
      .returning();

    return updated;
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
