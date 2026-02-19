import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import {
  clients,
  locations,
  assets,
  renditions,
  jurisdictions,
} from '../database/schema';
import * as XLSX from 'xlsx';

type ExportFormat = 'csv' | 'xlsx' | 'json';

@Injectable()
export class ExportService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async exportClients(firmId: string, format: ExportFormat): Promise<ExportResult> {
    const rows = await this.db
      .select({
        companyName: clients.companyName,
        ein: clients.ein,
        contactName: clients.contactName,
        contactEmail: clients.contactEmail,
        contactPhone: clients.contactPhone,
        industry: clients.industry,
        notes: clients.notes,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(and(eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .orderBy(clients.companyName);

    const data = rows.map((r) => ({
      'Company Name': r.companyName,
      EIN: r.ein ?? '',
      'Contact Name': r.contactName ?? '',
      'Contact Email': r.contactEmail ?? '',
      'Contact Phone': r.contactPhone ?? '',
      Industry: r.industry ?? '',
      Notes: r.notes ?? '',
      'Created At': r.createdAt?.toISOString() ?? '',
    }));

    return this.formatData(data, format, 'clients');
  }

  async exportAssets(
    firmId: string,
    format: ExportFormat,
    filters?: { clientId?: string; locationId?: string },
  ): Promise<ExportResult> {
    const conditions = [
      eq(clients.firmId, firmId),
      isNull(clients.deletedAt),
      isNull(locations.deletedAt),
      isNull(assets.deletedAt),
    ];

    if (filters?.clientId) {
      conditions.push(eq(locations.clientId, filters.clientId));
    }
    if (filters?.locationId) {
      conditions.push(eq(assets.locationId, filters.locationId));
    }

    const rows = await this.db
      .select({
        companyName: clients.companyName,
        locationName: locations.name,
        description: assets.description,
        category: assets.category,
        originalCost: assets.originalCost,
        acquisitionDate: assets.acquisitionDate,
        disposalDate: assets.disposalDate,
        quantity: assets.quantity,
        isLeased: assets.isLeased,
        lessorName: assets.lessorName,
        notes: assets.notes,
      })
      .from(assets)
      .innerJoin(locations, eq(assets.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(clients.companyName, locations.name, assets.description);

    const data = rows.map((r) => ({
      'Company': r.companyName,
      'Location': r.locationName,
      'Description': r.description,
      'Category': r.category,
      'Original Cost': r.originalCost,
      'Acquisition Date': r.acquisitionDate,
      'Disposal Date': r.disposalDate ?? '',
      'Quantity': r.quantity ?? 1,
      'Leased': r.isLeased ? 'Yes' : 'No',
      'Lessor': r.lessorName ?? '',
      'Notes': r.notes ?? '',
    }));

    return this.formatData(data, format, 'assets');
  }

  async exportRenditions(
    firmId: string,
    format: ExportFormat,
    filters?: { taxYear?: number; status?: string },
  ): Promise<ExportResult> {
    const conditions = [
      eq(clients.firmId, firmId),
      isNull(clients.deletedAt),
      isNull(locations.deletedAt),
    ];

    if (filters?.taxYear) {
      conditions.push(eq(renditions.taxYear, filters.taxYear));
    }
    if (filters?.status) {
      conditions.push(
        eq(renditions.status, filters.status as typeof renditions.$inferSelect.status),
      );
    }

    const rows = await this.db
      .select({
        companyName: clients.companyName,
        locationName: locations.name,
        county: jurisdictions.county,
        state: jurisdictions.state,
        taxYear: renditions.taxYear,
        status: renditions.status,
        calculatedTotals: renditions.calculatedTotals,
        filedAt: renditions.filedAt,
        createdAt: renditions.createdAt,
      })
      .from(renditions)
      .innerJoin(locations, eq(renditions.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .leftJoin(jurisdictions, eq(renditions.jurisdictionId, jurisdictions.id))
      .where(and(...conditions))
      .orderBy(clients.companyName, locations.name);

    const data = rows.map((r) => {
      const totals = r.calculatedTotals as Record<string, unknown> | null;
      return {
        'Company': r.companyName,
        'Location': r.locationName,
        'County': r.county ?? '',
        'State': r.state ?? '',
        'Tax Year': r.taxYear,
        'Status': r.status,
        'Total Original Cost': totals?.grandTotalOriginalCost ?? '',
        'Total Depreciated Value': totals?.grandTotalDepreciatedValue ?? '',
        'Total Assets': totals?.totalAssetCount ?? '',
        'Filed At': r.filedAt?.toISOString() ?? '',
        'Created At': r.createdAt?.toISOString() ?? '',
      };
    });

    return this.formatData(data, format, 'renditions');
  }

  private formatData(
    data: Record<string, unknown>[],
    format: ExportFormat,
    name: string,
  ): ExportResult {
    if (format === 'json') {
      return {
        buffer: Buffer.from(JSON.stringify(data, null, 2)),
        contentType: 'application/json',
        filename: `${name}-${Date.now()}.json`,
      };
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      return {
        buffer: Buffer.from(csv, 'utf-8'),
        contentType: 'text/csv',
        filename: `${name}-${Date.now()}.csv`,
      };
    }

    // xlsx
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: Buffer.from(xlsxBuffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${name}-${Date.now()}.xlsx`,
    };
  }
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}
