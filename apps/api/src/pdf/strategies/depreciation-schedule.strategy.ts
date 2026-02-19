import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { FormStrategy, FormStrategyResult, OwnerInfo } from './form-strategy.interface';
import { CalculationResult, AssetCalculation } from '../../depreciation/depreciation.service';

/**
 * Generates a multi-page depreciation schedule attachment.
 *
 * This is the detailed asset listing that CPAs typically attach to their
 * rendition filing. Appraisal districts frequently request it, and many
 * CPAs include it proactively. Each asset is listed with:
 *   - Description, category, acquisition year
 *   - Original cost, year of life, percent good, depreciated value
 *
 * Assets are grouped by category, sorted by acquisition year descending.
 * Summary totals appear at the bottom of the schedule.
 */

const CATEGORY_LABELS: Record<string, string> = {
  furniture_fixtures: 'Furniture & Fixtures',
  office_equipment: 'Office Equipment',
  machinery_equipment: 'Machinery & Equipment',
  medical_equipment: 'Medical / Professional Equipment',
  restaurant_equipment: 'Restaurant / Store Equipment',
  computer_equipment: 'Computer Equipment',
  telecommunications: 'Telecommunications',
  software: 'Software',
  leasehold_improvements: 'Leasehold Improvements',
  vehicles: 'Vehicles',
  tools_dies: 'Tools, Dies & Molds',
  signs_displays: 'Signs & Displays',
  inventory: 'Inventory',
  supplies: 'Supplies',
  leased_equipment: 'Leased Equipment',
  other: 'Other',
};

// Layout constants
const PAGE_WIDTH = 612; // Letter width
const PAGE_HEIGHT = 792; // Letter height
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 50;
const LINE_HEIGHT = 14;
const HEADER_HEIGHT = 80;

// Column positions (X coordinates)
const COL_DESC = MARGIN_LEFT;
const COL_YEAR = 280;
const COL_COST = 330;
const COL_LIFE = 400;
const COL_PCT = 435;
const COL_VALUE = 490;

export class DepreciationScheduleStrategy implements FormStrategy {
  readonly strategyId = 'depreciation-schedule';
  readonly formName = 'Depreciation Schedule';

  async fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Group assets by category
    const assetsByCategory = this.groupByCategory(calculation.assets);
    const categories = Object.keys(assetsByCategory).sort();

    let page = this.addPage(pdfDoc);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    // Title and header
    y = this.drawTitle(page, fontBold, font, owner, calculation, y);

    // Column headers
    y = this.drawColumnHeaders(page, fontBold, y);

    // Assets grouped by category
    for (const category of categories) {
      const assets = assetsByCategory[category];
      const label = CATEGORY_LABELS[category] ?? category;

      // Check if we need a new page (category header + at least 2 assets)
      if (y < MARGIN_BOTTOM + LINE_HEIGHT * 4) {
        page = this.addPage(pdfDoc);
        y = PAGE_HEIGHT - MARGIN_TOP;
        y = this.drawColumnHeaders(page, fontBold, y);
      }

      // Category header
      y -= LINE_HEIGHT * 1.5;
      page.drawText(label, {
        x: COL_DESC,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.6),
      });
      y -= 2;
      page.drawLine({
        start: { x: COL_DESC, y },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
        thickness: 0.5,
        color: rgb(0.2, 0.2, 0.6),
      });
      y -= LINE_HEIGHT;

      let catCost = 0;
      let catValue = 0;

      // Sort by acquisition year descending
      const sorted = [...assets].sort((a, b) => b.acquisitionYear - a.acquisitionYear);

      for (const asset of sorted) {
        if (y < MARGIN_BOTTOM + LINE_HEIGHT * 2) {
          page = this.addPage(pdfDoc);
          y = PAGE_HEIGHT - MARGIN_TOP;
          y = this.drawColumnHeaders(page, fontBold, y);
        }

        // Truncate description to fit
        const desc = this.truncate(asset.description, 35);
        const qty = asset.quantity > 1 ? ` (x${asset.quantity})` : '';

        page.drawText(`${desc}${qty}`, { x: COL_DESC, y, size: 8, font });
        page.drawText(String(asset.acquisitionYear), { x: COL_YEAR, y, size: 8, font });
        page.drawText(this.fmtCurrency(asset.originalCost), { x: COL_COST, y, size: 8, font });
        page.drawText(String(asset.yearOfLife), { x: COL_LIFE, y, size: 8, font });
        page.drawText(`${(asset.percentGood).toFixed(1)}%`, { x: COL_PCT, y, size: 8, font });
        page.drawText(this.fmtCurrency(asset.depreciatedValue), { x: COL_VALUE, y, size: 8, font });

        catCost += asset.originalCost;
        catValue += asset.depreciatedValue;
        y -= LINE_HEIGHT;
      }

      // Category subtotal
      if (y < MARGIN_BOTTOM + LINE_HEIGHT * 2) {
        page = this.addPage(pdfDoc);
        y = PAGE_HEIGHT - MARGIN_TOP;
        y = this.drawColumnHeaders(page, fontBold, y);
      }

      y -= 2;
      page.drawLine({
        start: { x: COL_COST, y: y + LINE_HEIGHT - 2 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y + LINE_HEIGHT - 2 },
        thickness: 0.3,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(`Subtotal (${assets.length} items)`, {
        x: COL_DESC,
        y,
        size: 8,
        font: fontBold,
      });
      page.drawText(this.fmtCurrency(catCost), { x: COL_COST, y, size: 8, font: fontBold });
      page.drawText(this.fmtCurrency(catValue), { x: COL_VALUE, y, size: 8, font: fontBold });
      y -= LINE_HEIGHT;
    }

    // Grand total
    if (y < MARGIN_BOTTOM + LINE_HEIGHT * 4) {
      page = this.addPage(pdfDoc);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }

    y -= LINE_HEIGHT;
    page.drawLine({
      start: { x: MARGIN_LEFT, y: y + LINE_HEIGHT + 2 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y + LINE_HEIGHT + 2 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawText('GRAND TOTAL', { x: COL_DESC, y, size: 10, font: fontBold });
    page.drawText(`${calculation.totalAssetCount} assets`, {
      x: COL_YEAR,
      y,
      size: 8,
      font: fontBold,
    });
    page.drawText(this.fmtCurrency(calculation.grandTotalOriginalCost), {
      x: COL_COST,
      y,
      size: 9,
      font: fontBold,
    });
    page.drawText(this.fmtCurrency(calculation.grandTotalDepreciatedValue), {
      x: COL_VALUE,
      y,
      size: 9,
      font: fontBold,
    });

    // HB 9 info if applicable
    if (calculation.hb9) {
      y -= LINE_HEIGHT * 2;
      const exemptText = calculation.hb9.isExempt
        ? `HB 9 Exempt: Value $${Math.round(calculation.grandTotalDepreciatedValue).toLocaleString()} is at or below $125,000 threshold`
        : `HB 9: Value $${Math.round(calculation.grandTotalDepreciatedValue).toLocaleString()} exceeds $125,000 threshold — net taxable: $${Math.round(calculation.hb9.netTaxableValue).toLocaleString()}`;
      page.drawText(exemptText, { x: COL_DESC, y, size: 8, font });
    }

    // Footer
    y -= LINE_HEIGHT * 2;
    page.drawText(
      `Generated ${new Date().toLocaleDateString('en-US')} — For tax year ${calculation.taxYear}`,
      { x: COL_DESC, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) },
    );

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, formName: this.formName };
  }

  private addPage(pdfDoc: PDFDocument): PDFPage {
    return pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  private drawTitle(
    page: PDFPage,
    fontBold: PDFFont,
    font: PDFFont,
    owner: OwnerInfo,
    calculation: CalculationResult,
    y: number,
  ): number {
    page.drawText('DEPRECIATION SCHEDULE', {
      x: MARGIN_LEFT,
      y,
      size: 14,
      font: fontBold,
    });
    y -= LINE_HEIGHT * 1.2;

    page.drawText(`Business Personal Property — Tax Year ${calculation.taxYear}`, {
      x: MARGIN_LEFT,
      y,
      size: 10,
      font,
    });
    y -= LINE_HEIGHT * 1.5;

    page.drawText(owner.name, { x: MARGIN_LEFT, y, size: 10, font: fontBold });
    y -= LINE_HEIGHT;

    const addr = `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip}`;
    page.drawText(addr, { x: MARGIN_LEFT, y, size: 9, font });
    y -= LINE_HEIGHT;

    if (owner.accountNumber) {
      page.drawText(`Account: ${owner.accountNumber}`, { x: MARGIN_LEFT, y, size: 9, font });
      y -= LINE_HEIGHT;
    }

    if (owner.county) {
      page.drawText(`County: ${owner.county}`, { x: MARGIN_LEFT, y, size: 9, font });
      y -= LINE_HEIGHT;
    }

    y -= LINE_HEIGHT * 0.5;
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT;

    return y;
  }

  private drawColumnHeaders(page: PDFPage, fontBold: PDFFont, y: number): number {
    const headerY = y;
    page.drawText('Description', { x: COL_DESC, y: headerY, size: 8, font: fontBold });
    page.drawText('Year', { x: COL_YEAR, y: headerY, size: 8, font: fontBold });
    page.drawText('Orig. Cost', { x: COL_COST, y: headerY, size: 8, font: fontBold });
    page.drawText('Life', { x: COL_LIFE, y: headerY, size: 8, font: fontBold });
    page.drawText('% Good', { x: COL_PCT, y: headerY, size: 8, font: fontBold });
    page.drawText('FMV', { x: COL_VALUE, y: headerY, size: 8, font: fontBold });

    y -= 4;
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT;

    return y;
  }

  private groupByCategory(assets: AssetCalculation[]): Record<string, AssetCalculation[]> {
    const groups: Record<string, AssetCalculation[]> = {};
    for (const asset of assets) {
      if (!groups[asset.category]) groups[asset.category] = [];
      groups[asset.category].push(asset);
    }
    return groups;
  }

  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + '...';
  }

  private fmtCurrency(amount: number): string {
    return '$' + Math.round(amount).toLocaleString('en-US');
  }
}
