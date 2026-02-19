import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { renditions, locations, clients, jurisdictions } from '../database/schema';
import { CalculationResult, DepreciationService } from '../depreciation/depreciation.service';
import { FormStrategyFactory } from './strategies/form-strategy.factory';
import { OwnerInfo } from './strategies/form-strategy.interface';
import { TxHb9CertificationStrategy } from './strategies/tx-hb9-certification.strategy';
import { DepreciationScheduleStrategy } from './strategies/depreciation-schedule.strategy';
import type { FmvOverrideEntry } from '../database/schema/renditions';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @InjectDrizzle() private db: DrizzleDB,
    private readonly strategyFactory: FormStrategyFactory,
  ) {}

  async generatePdf(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
  ): Promise<{ pdfBytes: Buffer; filename: string }> {
    // Load rendition
    const [rendition] = await this.db
      .select()
      .from(renditions)
      .where(eq(renditions.id, renditionId))
      .limit(1);

    if (!rendition) {
      throw new NotFoundException('Rendition not found');
    }

    if (rendition.status !== 'approved' && rendition.status !== 'filed') {
      throw new BadRequestException(
        `Rendition must be in "approved" or "filed" status to generate PDF. Current: "${rendition.status}"`,
      );
    }

    if (!rendition.calculatedTotals) {
      throw new BadRequestException(
        'Rendition has no calculated totals. Recalculate before generating PDF.',
      );
    }

    // Load client + location info for owner section
    const clientData = await this.loadClientAndLocation(firmId, clientId, locationId);

    // Load jurisdiction for state + county routing
    const jurisdiction = await this.loadJurisdiction(rendition.jurisdictionId);

    let calculation = rendition.calculatedTotals as unknown as CalculationResult;

    // Apply FMV overrides if any exist
    const overrides = rendition.fmvOverrides as Record<string, FmvOverrideEntry> | null;
    if (overrides && Object.keys(overrides).length > 0) {
      calculation = DepreciationService.applyOverrides(calculation, overrides);
    }

    // If TX elect-not-to-render, generate certification instead of full form
    const isElectNotToRender = rendition.hb9ElectNotToRender &&
      jurisdiction.state === 'TX' &&
      calculation.hb9?.isExempt;

    const strategy = isElectNotToRender
      ? new TxHb9CertificationStrategy()
      : this.strategyFactory.getStrategy(
          jurisdiction.state,
          jurisdiction.county,
          calculation.grandTotalDepreciatedValue,
        );

    const ownerInfo: OwnerInfo = {
      name: clientData.companyName,
      address: clientData.address ?? '',
      city: clientData.city ?? '',
      state: clientData.state ?? jurisdiction.state,
      zip: clientData.zip ?? '',
      phone: clientData.contactPhone ?? undefined,
      ein: clientData.ein ?? undefined,
      accountNumber: clientData.accountNumber ?? undefined,
      contactName: clientData.contactName ?? undefined,
      contactEmail: clientData.contactEmail ?? undefined,
      county: jurisdiction.county,
    };

    // Delegate to strategy
    const { pdfBytes, formName } = await strategy.fillForm(ownerInfo, calculation);

    const filename = `${formName.replace(/[^a-zA-Z0-9]/g, '-')}-${clientData.companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${rendition.taxYear}.pdf`;

    this.logger.log(
      `Generated PDF (${strategy.strategyId}) for rendition ${renditionId}: ${filename}`,
    );

    return {
      pdfBytes: Buffer.from(pdfBytes),
      filename,
    };
  }

  /**
   * Generate a depreciation schedule attachment for a rendition.
   * This is a separate PDF listing every asset with depreciation detail.
   */
  async generateDepreciationSchedule(
    firmId: string,
    clientId: string,
    locationId: string,
    renditionId: string,
  ): Promise<{ pdfBytes: Buffer; filename: string }> {
    const [rendition] = await this.db
      .select()
      .from(renditions)
      .where(eq(renditions.id, renditionId))
      .limit(1);

    if (!rendition || !rendition.calculatedTotals) {
      throw new BadRequestException(
        'Rendition not found or has no calculated totals.',
      );
    }

    const clientData = await this.loadClientAndLocation(firmId, clientId, locationId);
    const jurisdiction = await this.loadJurisdiction(rendition.jurisdictionId);
    const calculation = rendition.calculatedTotals as unknown as CalculationResult;

    const ownerInfo: OwnerInfo = {
      name: clientData.companyName,
      address: clientData.address ?? '',
      city: clientData.city ?? '',
      state: clientData.state ?? jurisdiction.state,
      zip: clientData.zip ?? '',
      accountNumber: clientData.accountNumber ?? undefined,
      county: jurisdiction.county,
    };

    const strategy = new DepreciationScheduleStrategy();
    const { pdfBytes } = await strategy.fillForm(ownerInfo, calculation);

    const filename = `Depreciation-Schedule-${clientData.companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${rendition.taxYear}.pdf`;

    return { pdfBytes: Buffer.from(pdfBytes), filename };
  }

  private async loadJurisdiction(jurisdictionId: string) {
    const [j] = await this.db
      .select({
        state: jurisdictions.state,
        county: jurisdictions.county,
      })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, jurisdictionId))
      .limit(1);

    if (!j) {
      throw new NotFoundException('Jurisdiction not found for this rendition');
    }

    return j;
  }

  private async loadClientAndLocation(
    firmId: string,
    clientId: string,
    locationId: string,
  ) {
    const result = await this.db
      .select({
        companyName: clients.companyName,
        ein: clients.ein,
        contactPhone: clients.contactPhone,
        contactName: clients.contactName,
        contactEmail: clients.contactEmail,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        zip: locations.zip,
        accountNumber: locations.accountNumber,
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
      throw new NotFoundException('Client/Location not found');
    }

    return result[0];
  }
}
