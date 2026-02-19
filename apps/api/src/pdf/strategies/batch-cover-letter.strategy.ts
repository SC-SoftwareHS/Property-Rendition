import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

/**
 * Generates a batch filing cover letter for inclusion in ZIP downloads.
 *
 * When a CPA batch-generates renditions (e.g., 70 clients at once), this
 * cover letter serves as a table of contents listing every rendition in
 * the package with key details: client name, form type, account number,
 * total value, and filing status.
 *
 * This is NOT a FormStrategy because it takes different inputs (list of
 * rendition results rather than a single owner + calculation).
 */

export interface BatchRenditionEntry {
  companyName: string;
  locationName: string;
  formName: string;
  accountNumber?: string;
  county: string;
  state: string;
  totalOriginalCost: number;
  totalDepreciatedValue: number;
  taxYear: number;
  status: 'success' | 'failed';
  error?: string;
}

// Layout constants
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 50;
const LINE_HEIGHT = 14;

// Table column positions
const COL_NUM = MARGIN_LEFT;
const COL_CLIENT = MARGIN_LEFT + 20;
const COL_FORM = 250;
const COL_ACCT = 330;
const COL_VALUE = 420;
const COL_STATUS = 500;

export class BatchCoverLetterGenerator {
  async generate(
    firmName: string,
    preparedBy: string,
    entries: BatchRenditionEntry[],
    taxYear: number,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    // Title
    page.drawText('BATCH FILING COVER LETTER', {
      x: MARGIN_LEFT,
      y,
      size: 16,
      font: fontBold,
    });
    y -= LINE_HEIGHT * 1.5;

    page.drawText(`Business Personal Property Renditions — Tax Year ${taxYear}`, {
      x: MARGIN_LEFT,
      y,
      size: 11,
      font,
    });
    y -= LINE_HEIGHT * 2;

    // Filing summary
    const successCount = entries.filter((e) => e.status === 'success').length;
    const failedCount = entries.filter((e) => e.status === 'failed').length;
    const totalCost = entries
      .filter((e) => e.status === 'success')
      .reduce((sum, e) => sum + e.totalOriginalCost, 0);
    const totalValue = entries
      .filter((e) => e.status === 'success')
      .reduce((sum, e) => sum + e.totalDepreciatedValue, 0);

    page.drawText(`Prepared by: ${firmName}`, { x: MARGIN_LEFT, y, size: 9, font: fontBold });
    y -= LINE_HEIGHT;
    page.drawText(`Preparer: ${preparedBy}`, { x: MARGIN_LEFT, y, size: 9, font });
    y -= LINE_HEIGHT;
    page.drawText(`Date: ${new Date().toLocaleDateString('en-US')}`, {
      x: MARGIN_LEFT,
      y,
      size: 9,
      font,
    });
    y -= LINE_HEIGHT * 1.5;

    page.drawText(`Total Renditions: ${entries.length}`, { x: MARGIN_LEFT, y, size: 9, font });
    page.drawText(`Successful: ${successCount}`, { x: 220, y, size: 9, font });
    if (failedCount > 0) {
      page.drawText(`Failed: ${failedCount}`, {
        x: 350,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.8, 0, 0),
      });
    }
    y -= LINE_HEIGHT;

    page.drawText(
      `Total Original Cost: $${Math.round(totalCost).toLocaleString('en-US')}`,
      { x: MARGIN_LEFT, y, size: 9, font },
    );
    page.drawText(
      `Total FMV: $${Math.round(totalValue).toLocaleString('en-US')}`,
      { x: 280, y, size: 9, font },
    );
    y -= LINE_HEIGHT * 1.5;

    // Separator
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT * 1.5;

    // Table header
    y = this.drawTableHeader(page, fontBold, y);

    // Table rows
    for (let i = 0; i < entries.length; i++) {
      if (y < MARGIN_BOTTOM + LINE_HEIGHT * 2) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
        y = this.drawTableHeader(page, fontBold, y);
      }

      const entry = entries[i];
      const isFailed = entry.status === 'failed';
      const textColor = isFailed ? rgb(0.7, 0, 0) : rgb(0, 0, 0);

      page.drawText(String(i + 1), { x: COL_NUM, y, size: 7, font, color: textColor });

      const clientText = this.truncate(entry.companyName, 30);
      page.drawText(clientText, { x: COL_CLIENT, y, size: 7, font, color: textColor });

      page.drawText(entry.formName, { x: COL_FORM, y, size: 7, font, color: textColor });

      page.drawText(entry.accountNumber ?? '—', {
        x: COL_ACCT,
        y,
        size: 7,
        font,
        color: textColor,
      });

      if (!isFailed) {
        page.drawText(`$${Math.round(entry.totalDepreciatedValue).toLocaleString('en-US')}`, {
          x: COL_VALUE,
          y,
          size: 7,
          font,
          color: textColor,
        });
      }

      const statusText = isFailed ? 'FAILED' : 'Filed';
      page.drawText(statusText, {
        x: COL_STATUS,
        y,
        size: 7,
        font: isFailed ? fontBold : font,
        color: textColor,
      });

      y -= LINE_HEIGHT;

      // If failed, add error detail on next line
      if (isFailed && entry.error) {
        if (y < MARGIN_BOTTOM + LINE_HEIGHT) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN_TOP;
          y = this.drawTableHeader(page, fontBold, y);
        }
        page.drawText(`  Error: ${this.truncate(entry.error, 80)}`, {
          x: COL_CLIENT,
          y,
          size: 6,
          font,
          color: rgb(0.7, 0, 0),
        });
        y -= LINE_HEIGHT;
      }
    }

    // Footer
    y -= LINE_HEIGHT * 2;
    if (y < MARGIN_BOTTOM + LINE_HEIGHT * 3) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }

    page.drawLine({
      start: { x: MARGIN_LEFT, y: y + LINE_HEIGHT },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y + LINE_HEIGHT },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(
      'This cover letter is for internal use and is not filed with any appraisal district or tax assessor.',
      { x: MARGIN_LEFT, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) },
    );
    y -= LINE_HEIGHT;
    page.drawText(
      `Generated by RenditionReady on ${new Date().toLocaleDateString('en-US')}`,
      { x: MARGIN_LEFT, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) },
    );

    return pdfDoc.save();
  }

  private drawTableHeader(page: PDFPage, fontBold: PDFFont, y: number): number {
    page.drawText('#', { x: COL_NUM, y, size: 7, font: fontBold });
    page.drawText('Client / Location', { x: COL_CLIENT, y, size: 7, font: fontBold });
    page.drawText('Form', { x: COL_FORM, y, size: 7, font: fontBold });
    page.drawText('Account #', { x: COL_ACCT, y, size: 7, font: fontBold });
    page.drawText('FMV', { x: COL_VALUE, y, size: 7, font: fontBold });
    page.drawText('Status', { x: COL_STATUS, y, size: 7, font: fontBold });

    y -= 3;
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT;

    return y;
  }

  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + '...';
  }
}
