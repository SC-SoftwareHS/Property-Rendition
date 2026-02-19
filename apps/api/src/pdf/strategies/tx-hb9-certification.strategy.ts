import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FormStrategy, FormStrategyResult, OwnerInfo } from './form-strategy.interface';
import { CalculationResult } from '../../depreciation/depreciation.service';

/**
 * TX HB 9 Elect-Not-to-Render Certification.
 *
 * When a business's total BPP value is $125,000 or less and they elect
 * not to file a rendition, this strategy generates a one-page certification
 * letter documenting the election. This is kept on file (not filed with the
 * appraisal district) — the owner simply does not submit Form 50-144.
 *
 * Per HB 9 (effective Jan 1, 2026): owners of BPP with appraised value
 * ≤ $125,000 may elect not to render. If related entities at the same
 * address aggregate above $125,000, all must render (the "all or nothing" rule).
 */
export class TxHb9CertificationStrategy implements FormStrategy {
  readonly strategyId = 'tx-hb9-certification';
  readonly formName = 'HB 9 Certification';

  async fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    let y = 720;

    // Title
    page.drawText('HB 9 ELECT-NOT-TO-RENDER CERTIFICATION', {
      x: 72,
      y,
      size: 16,
      font: helveticaBold,
      color: black,
    });
    y -= 28;

    page.drawText(`Tax Year ${calculation.taxYear}`, {
      x: 72,
      y,
      size: 12,
      font: helvetica,
      color: gray,
    });
    y -= 40;

    // Owner info section
    const drawLabel = (label: string, value: string) => {
      page.drawText(`${label}:`, {
        x: 72,
        y,
        size: 10,
        font: helveticaBold,
        color: black,
      });
      page.drawText(value, {
        x: 220,
        y,
        size: 10,
        font: helvetica,
        color: black,
      });
      y -= 18;
    };

    drawLabel('Business Name', owner.name);
    drawLabel('Owner/Contact', owner.contactName ?? owner.name);
    drawLabel('Property Address', `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip}`);
    if (owner.county) drawLabel('County', owner.county);
    if (owner.accountNumber) drawLabel('Account Number', owner.accountNumber);
    if (owner.phone) drawLabel('Phone', owner.phone);
    if (owner.contactEmail) drawLabel('Email', owner.contactEmail);
    y -= 12;

    // Separator
    page.drawLine({
      start: { x: 72, y },
      end: { x: 540, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 24;

    // Value summary
    page.drawText('BPP Value Summary', {
      x: 72,
      y,
      size: 12,
      font: helveticaBold,
      color: black,
    });
    y -= 22;

    const totalValue = calculation.grandTotalDepreciatedValue;
    const exemption = calculation.hb9?.exemptionAmount ?? 125_000;
    const fmtCurrency = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

    drawLabel('Total Original Cost', fmtCurrency(calculation.grandTotalOriginalCost));
    drawLabel('Total Depreciated Value', fmtCurrency(totalValue));
    drawLabel('HB 9 Exemption Amount', fmtCurrency(exemption));
    drawLabel('Amount Under Threshold', fmtCurrency(Math.max(0, exemption - totalValue)));
    y -= 12;

    // Separator
    page.drawLine({
      start: { x: 72, y },
      end: { x: 540, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 24;

    // Certification text
    page.drawText('Certification', {
      x: 72,
      y,
      size: 12,
      font: helveticaBold,
      color: black,
    });
    y -= 22;

    const certText = [
      `Pursuant to Texas HB 9 (effective January 1, 2026), the undersigned certifies`,
      `that the total appraised value of all business personal property owned at the`,
      `above location is ${fmtCurrency(totalValue)}, which does not exceed the`,
      `$125,000 exemption threshold established by HB 9.`,
      ``,
      `The owner elects not to file a rendition (Form 50-144) for tax year`,
      `${calculation.taxYear} for this location. This certification is retained on file`,
      `as documentation of the election.`,
      ``,
      `No related business entities at this address have aggregate BPP values`,
      `exceeding the $125,000 threshold.`,
    ];

    for (const line of certText) {
      page.drawText(line, {
        x: 72,
        y,
        size: 10,
        font: helvetica,
        color: black,
      });
      y -= 16;
    }
    y -= 20;

    // Signature lines
    page.drawLine({
      start: { x: 72, y },
      end: { x: 300, y },
      thickness: 0.5,
      color: black,
    });
    page.drawText('Signature', {
      x: 72,
      y: y - 14,
      size: 8,
      font: helvetica,
      color: gray,
    });

    page.drawLine({
      start: { x: 340, y },
      end: { x: 540, y },
      thickness: 0.5,
      color: black,
    });
    page.drawText('Date', {
      x: 340,
      y: y - 14,
      size: 8,
      font: helvetica,
      color: gray,
    });
    y -= 40;

    page.drawLine({
      start: { x: 72, y },
      end: { x: 300, y },
      thickness: 0.5,
      color: black,
    });
    page.drawText('Printed Name', {
      x: 72,
      y: y - 14,
      size: 8,
      font: helvetica,
      color: gray,
    });

    page.drawLine({
      start: { x: 340, y },
      end: { x: 540, y },
      thickness: 0.5,
      color: black,
    });
    page.drawText('Title', {
      x: 340,
      y: y - 14,
      size: 8,
      font: helvetica,
      color: gray,
    });

    // Footer
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    page.drawText(`Generated by RenditionReady on ${generatedDate}`, {
      x: 72,
      y: 50,
      size: 8,
      font: helvetica,
      color: gray,
    });

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, formName: this.formName };
  }
}
