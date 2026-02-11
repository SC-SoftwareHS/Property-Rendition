import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { renditions, locations, clients, jurisdictions } from '../database/schema';
import { CalculationResult } from '../depreciation/depreciation.service';
import { fillTxForm, OwnerInfo } from './strategies/tx-form.strategy';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

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

    // Load client info for owner section
    const clientData = await this.loadClientAndLocation(firmId, clientId, locationId);

    // Load the blank TX Form 50-144 template
    const templatePath = path.join(process.cwd(), 'src', 'pdf', 'templates', 'tx-50-144.pdf');
    let templateBytes: Uint8Array;

    try {
      templateBytes = fs.readFileSync(templatePath);
    } catch {
      throw new BadRequestException(
        'TX Form 50-144 template not found. Ensure the template PDF is in the templates directory.',
      );
    }

    // Load and fill the PDF
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const calculation = rendition.calculatedTotals as unknown as CalculationResult;

    const ownerInfo: OwnerInfo = {
      name: clientData.companyName,
      address: clientData.address ?? '',
      city: clientData.city ?? '',
      state: clientData.state ?? 'TX',
      zip: clientData.zip ?? '',
      phone: clientData.contactPhone ?? undefined,
      ein: clientData.ein ?? undefined,
      accountNumber: clientData.accountNumber ?? undefined,
    };

    fillTxForm(form, ownerInfo, calculation);

    // Mark filled fields as read-only (flatten can crash on large government PDFs)
    try {
      form.flatten();
    } catch (err) {
      this.logger.warn(`form.flatten() failed, saving with editable fields: ${err}`);
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `rendition-${clientData.companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${rendition.taxYear}.pdf`;

    this.logger.log(`Generated PDF for rendition ${renditionId}: ${filename}`);

    return {
      pdfBytes: Buffer.from(pdfBytes),
      filename,
    };
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
