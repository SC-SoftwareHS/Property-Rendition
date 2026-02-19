import { PDFDocument, PDFForm } from 'pdf-lib';
import { FormStrategy, FormStrategyResult, OwnerInfo } from './form-strategy.interface';
import { CalculationResult } from '../../depreciation/depreciation.service';
import { setFieldSafe, setRadioSafe, formatCurrency, loadTemplate } from './shared-utils';

/**
 * TX Form 50-144 (2026 revision) field mapping strategy.
 *
 * The 2026 form is 4 pages with 306 named fields:
 *
 * Page 1: Owner/business info, HB 9 questions, simplified schedules ScA-ScD
 *   - Owner: "Business Name", "Business Owner", "Property Location...", "Email", "Phone..."
 *   - Account: "Appraisal District Account Number", "Tax Year"
 *   - HB 9: "Total market value of your property-2" radio (["$125,000 or less","More than $125,000"])
 *   - Related entity: "Business related" radio (["Yes","No"])
 *   - Simplified ScA-ScD: 3 rows each for item-level descriptions
 *
 * Pages 2-3: Detailed cost schedules (per-year rows)
 *   - Sections A-C: 14 data rows + total (row 15). HCWN_[1-14][A-C], GFEMV_[1-14][A-C]
 *   - Sections D-E: 9 data rows + total (row 10). HCWN_[1-9][D-E], GFEMV_[1-9][D-E]
 *   - Section F: 9 data rows + total (row 10). Description_[1-9], HCWN_[1-9]F, GFEMV_[1-9]F
 *   - Totals: HCWNT_15[A-C], GFEMVT_15[A-C], HCWNT_10[D-F], GFEMVT_10[D-F]
 *
 * Page 4: Signature, certification, notary
 *
 * HCWN = Historical Cost When New
 * GFEMV = Good Faith Estimate of Market Value
 */

/** Category → detailed schedule section mapping */
const CATEGORY_SECTION: Record<string, string> = {
  furniture_fixtures: 'A',
  office_equipment: 'A',
  machinery_equipment: 'B',
  medical_equipment: 'B',
  restaurant_equipment: 'B',
  tools_dies: 'B',
  computer_equipment: 'C',
  telecommunications: 'C',
  software: 'C',
  vehicles: 'D',
  leasehold_improvements: 'E',
  leased_equipment: 'E',
  signs_displays: 'E',
  other: 'E',
  inventory: 'F',
  supplies: 'F',
};

/** Max data rows per section (not counting the total row) */
const SECTION_MAX_ROWS: Record<string, number> = {
  A: 14,
  B: 14,
  C: 14,
  D: 9,
  E: 9,
  F: 9,
};

/** Total row number per section */
const SECTION_TOTAL_ROW: Record<string, number> = {
  A: 15,
  B: 15,
  C: 15,
  D: 10,
  E: 10,
  F: 10,
};

/** HB 9 exemption amount (effective Jan 1, 2026) */
const HB9_EXEMPTION_AMOUNT = 125_000;

export class TxStandardFormStrategy implements FormStrategy {
  readonly strategyId = 'tx-50-144';
  readonly formName = 'TX Form 50-144';

  async fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult> {
    const templateBytes = loadTemplate('tx-50-144.pdf');
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    this.fillOwnerInfo(form, owner, calculation);
    this.fillHb9Fields(form, calculation);
    this.fillDetailedSchedules(form, calculation);

    try {
      form.flatten();
    } catch {
      // Flatten can crash on large government PDFs — save with editable fields
    }

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, formName: this.formName };
  }

  private fillOwnerInfo(
    form: PDFForm,
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): void {
    setFieldSafe(form, 'Business Name', owner.name);
    setFieldSafe(form, 'Business Owner', owner.contactName ?? owner.name);
    setFieldSafe(
      form,
      'Property Location Address, City, State, ZIP Code',
      `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip}`,
    );
    if (owner.contactEmail) setFieldSafe(form, 'Email', owner.contactEmail);
    if (owner.phone) setFieldSafe(form, 'Phone (area code and number)', owner.phone);
    if (owner.accountNumber) {
      setFieldSafe(form, 'Appraisal District Account Number', owner.accountNumber);
      setFieldSafe(form, 'Account Number', owner.accountNumber);
      setFieldSafe(form, 'Account Number 2', owner.accountNumber);
    }
    setFieldSafe(form, 'Tax Year', String(calculation.taxYear));
  }

  /**
   * Fill HB 9-related fields:
   * - "Total market value of your property-2" → $125K threshold
   * - "Business related" → related business entity
   * - "Total market value of your property" → $20K simplified rendition threshold
   */
  private fillHb9Fields(form: PDFForm, calculation: CalculationResult): void {
    const totalValue = calculation.grandTotalDepreciatedValue;

    // HB 9: $125,000 threshold
    setRadioSafe(
      form,
      'Total market value of your property-2',
      totalValue <= HB9_EXEMPTION_AMOUNT ? '$125,000 or less' : 'More than $125,000',
    );

    // $20K simplified rendition threshold
    setRadioSafe(
      form,
      'Total market value of your property',
      totalValue < 20_000 ? 'under $20,000' : '$20,000 or more',
    );

    // Related business entity — default to "No" unless set in hb9 metadata
    if (calculation.hb9) {
      setRadioSafe(
        form,
        'Business related',
        calculation.hb9.hasRelatedEntities ? 'Yes' : 'No',
      );
    } else {
      setRadioSafe(form, 'Business related', 'No');
    }
  }

  /**
   * Fill pages 2-3 detailed cost schedules.
   * Each section gets year-grouped asset data placed in ascending year-of-life rows.
   * Row 1 = most recent acquisition year, Row N = N years ago.
   */
  private fillDetailedSchedules(form: PDFForm, calculation: CalculationResult): void {
    // Track per-section accumulated totals (multiple categories can map to same section)
    const sectionTotals: Record<string, { cost: number; value: number; nextRow: number }> = {};

    for (const [category, section] of Object.entries(CATEGORY_SECTION)) {
      const catData = calculation.byCategory[category];
      if (!catData) continue;

      if (!sectionTotals[section]) {
        sectionTotals[section] = { cost: 0, value: 0, nextRow: 1 };
      }

      const maxRows = SECTION_MAX_ROWS[section] ?? 9;
      const taxYear = calculation.taxYear;

      // Sort year groups by acquisition year descending (most recent first = row 1)
      const yearEntries = Object.entries(catData.byYear)
        .map(([yearStr, data]) => ({ year: parseInt(yearStr, 10), data }))
        .sort((a, b) => b.year - a.year);

      for (const { year, data } of yearEntries) {
        const yearOfLife = Math.max(1, taxYear - year + 1);
        let rowNum: number;

        // Use year-of-life as row number (row 1 = current year acquisition)
        rowNum = yearOfLife;
        if (rowNum > maxRows) continue;

        // If section F (inventory/supplies), also fill description
        if (section === 'F') {
          const desc = category === 'inventory' ? 'Inventory' : 'Supplies';
          setFieldSafe(form, `Description_${rowNum}`, desc);
        }

        setFieldSafe(form, `HCWN_${rowNum}${section}`, formatCurrency(data.originalCost));
        setFieldSafe(form, `GFEMV_${rowNum}${section}`, formatCurrency(data.depreciatedValue));

        sectionTotals[section].cost += data.originalCost;
        sectionTotals[section].value += data.depreciatedValue;
      }
    }

    // Fill section totals
    for (const [section, totals] of Object.entries(sectionTotals)) {
      const totalRow = SECTION_TOTAL_ROW[section] ?? 10;
      setFieldSafe(form, `HCWNT_${totalRow}${section}`, formatCurrency(totals.cost));
      setFieldSafe(form, `GFEMVT_${totalRow}${section}`, formatCurrency(totals.value));
    }
  }
}

