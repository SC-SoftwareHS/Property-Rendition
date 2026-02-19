import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

const CATEGORY_ALIASES: Record<string, string> = {
  'f&f': 'furniture_fixtures',
  'furniture': 'furniture_fixtures',
  'furniture & fixtures': 'furniture_fixtures',
  'furniture and fixtures': 'furniture_fixtures',
  'm&e': 'machinery_equipment',
  'machinery': 'machinery_equipment',
  'machinery & equipment': 'machinery_equipment',
  'machinery and equipment': 'machinery_equipment',
  'computers': 'computer_equipment',
  'computer': 'computer_equipment',
  'computer equipment': 'computer_equipment',
  'leasehold': 'leasehold_improvements',
  'leasehold improvements': 'leasehold_improvements',
  'vehicles': 'vehicles',
  'vehicle': 'vehicles',
  'auto': 'vehicles',
  'inventory': 'inventory',
  'supplies': 'supplies',
  'supply': 'supplies',
  'leased': 'leased_equipment',
  'leased equipment': 'leased_equipment',
  'other': 'other',
  // New expanded categories
  'office': 'office_equipment',
  'office equipment': 'office_equipment',
  'office equip': 'office_equipment',
  'medical': 'medical_equipment',
  'medical equipment': 'medical_equipment',
  'professional equipment': 'medical_equipment',
  'dental': 'medical_equipment',
  'dental equipment': 'medical_equipment',
  'restaurant': 'restaurant_equipment',
  'restaurant equipment': 'restaurant_equipment',
  'store equipment': 'restaurant_equipment',
  'kitchen equipment': 'restaurant_equipment',
  'telecom': 'telecommunications',
  'telecommunications': 'telecommunications',
  'phone': 'telecommunications',
  'phone system': 'telecommunications',
  'phone systems': 'telecommunications',
  'software': 'software',
  'computer software': 'software',
  'tools': 'tools_dies',
  'dies': 'tools_dies',
  'molds': 'tools_dies',
  'tools & dies': 'tools_dies',
  'tools, dies & molds': 'tools_dies',
  'tooling': 'tools_dies',
  'signs': 'signs_displays',
  'signage': 'signs_displays',
  'displays': 'signs_displays',
  'signs & displays': 'signs_displays',
  'signs and displays': 'signs_displays',
};

const VALID_CATEGORIES = new Set([
  'furniture_fixtures',
  'machinery_equipment',
  'computer_equipment',
  'leasehold_improvements',
  'vehicles',
  'inventory',
  'supplies',
  'leased_equipment',
  'other',
  'office_equipment',
  'medical_equipment',
  'restaurant_equipment',
  'telecommunications',
  'software',
  'tools_dies',
  'signs_displays',
]);

export interface ParsedResult {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
}

export interface ColumnMapping {
  description?: string;
  category?: string;
  originalCost?: string;
  acquisitionDate?: string;
  disposalDate?: string;
  quantity?: string;
  isLeased?: string;
  lessorName?: string;
  lessorAddress?: string;
  notes?: string;
}

export interface MappedAsset {
  description: string;
  category: string;
  originalCost: string;
  acquisitionDate: string;
  disposalDate?: string;
  quantity: number;
  isLeased: boolean;
  lessorName?: string;
  lessorAddress?: string;
  notes?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

@Injectable()
export class ImportService {
  parseFile(buffer: Buffer, filename: string): ParsedResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File contains no worksheets');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      raw: false,
      defval: '',
    });

    if (rows.length === 0) {
      throw new BadRequestException('File contains no data rows');
    }

    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);

    return {
      headers,
      preview,
      totalRows: rows.length,
    };
  }

  mapAndValidate(
    buffer: Buffer,
    filename: string,
    mapping: ColumnMapping,
  ): { assets: MappedAsset[]; errors: ValidationError[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      raw: false,
      defval: '',
    });

    const assets: MappedAsset[] = [];
    const errors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      // Description (required)
      const description = mapping.description ? row[mapping.description]?.trim() : '';
      if (!description) {
        errors.push({ row: rowNum, field: 'description', message: 'Description is required' });
        continue;
      }

      // Category
      let category = 'other';
      if (mapping.category) {
        const rawCat = row[mapping.category]?.trim().toLowerCase() ?? '';
        category = CATEGORY_ALIASES[rawCat] ?? (VALID_CATEGORIES.has(rawCat) ? rawCat : 'other');
      }

      // Cost (required)
      const rawCost = mapping.originalCost ? row[mapping.originalCost]?.trim() : '';
      const cost = this.parseCost(rawCost);
      if (!cost) {
        errors.push({ row: rowNum, field: 'originalCost', message: `Invalid cost: "${rawCost}"` });
        continue;
      }

      // Acquisition date (required)
      const rawDate = mapping.acquisitionDate ? row[mapping.acquisitionDate]?.trim() : '';
      const acquisitionDate = this.parseDate(rawDate);
      if (!acquisitionDate) {
        errors.push({ row: rowNum, field: 'acquisitionDate', message: `Invalid date: "${rawDate}"` });
        continue;
      }

      // Disposal date (optional)
      const rawDisposal = mapping.disposalDate ? row[mapping.disposalDate]?.trim() : '';
      const disposalDate = rawDisposal ? this.parseDate(rawDisposal) : undefined;

      // Quantity
      const rawQty = mapping.quantity ? row[mapping.quantity]?.trim() : '';
      const quantity = rawQty ? parseInt(rawQty, 10) || 1 : 1;

      // Is leased
      const rawLeased = mapping.isLeased ? row[mapping.isLeased]?.trim().toLowerCase() : '';
      const isLeased = ['true', 'yes', '1', 'y'].includes(rawLeased);

      assets.push({
        description,
        category,
        originalCost: cost,
        acquisitionDate,
        disposalDate: disposalDate ?? undefined,
        quantity,
        isLeased,
        lessorName: mapping.lessorName ? row[mapping.lessorName]?.trim() || undefined : undefined,
        lessorAddress: mapping.lessorAddress ? row[mapping.lessorAddress]?.trim() || undefined : undefined,
        notes: mapping.notes ? row[mapping.notes]?.trim() || undefined : undefined,
      });
    }

    return { assets, errors };
  }

  autoMapColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    const fieldMatchers: [keyof ColumnMapping, string[]][] = [
      ['description', ['description', 'desc', 'asset', 'item', 'name', 'asset description', 'asset name']],
      ['category', ['category', 'cat', 'type', 'asset type', 'asset category', 'class']],
      ['originalCost', ['cost', 'original cost', 'original_cost', 'price', 'amount', 'value']],
      ['acquisitionDate', ['acquisition date', 'acquisition_date', 'acquired', 'date acquired', 'purchase date', 'date']],
      ['disposalDate', ['disposal date', 'disposal_date', 'disposed', 'date disposed', 'sold date']],
      ['quantity', ['quantity', 'qty', 'count', 'units']],
      ['isLeased', ['leased', 'is_leased', 'is leased', 'lease']],
      ['lessorName', ['lessor', 'lessor name', 'lessor_name', 'leasing company']],
      ['lessorAddress', ['lessor address', 'lessor_address']],
      ['notes', ['notes', 'note', 'comments', 'memo']],
    ];

    for (const [field, aliases] of fieldMatchers) {
      const idx = lowerHeaders.findIndex((h) => aliases.includes(h));
      if (idx !== -1) {
        mapping[field] = headers[idx];
      }
    }

    return mapping;
  }

  private parseCost(raw: string): string | null {
    if (!raw) return null;
    // Remove $ , whitespace
    const cleaned = raw.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0) return null;
    return num.toFixed(2);
  }

  private parseDate(raw: string): string | null {
    if (!raw) return null;

    // Try ISO format first: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // MM/DD/YYYY or MM-DD-YYYY
    let match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    }

    // M/D/YY
    match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
    if (match) {
      const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
      return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    }

    return null;
  }
}
