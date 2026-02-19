import { PDFDocument, PDFForm } from 'pdf-lib';
import { FormStrategy, FormStrategyResult, OwnerInfo } from './form-strategy.interface';
import { CalculationResult } from '../../depreciation/depreciation.service';
import { setFieldSafe, setCheckboxSafe, formatCurrency, loadTemplate } from './shared-utils';

/**
 * Harris County (HCAD) Form 22.15 field mapping strategy.
 *
 * The form has 221 named interactive fields across 2 pages:
 *
 * Page 1: Owner info + business details + HB 9 checkbox + signature/preparer
 *   - Owner: "1.1 Business Name", "1.2 Business Owner",
 *     "1.3 Mailing Address City State Zip Code",
 *     "1.4 Property Location Address City State Zip Code",
 *     "1.5 Phone area code and number", "Account Number"
 *   - Related business: "BusinessRelatedtoOthers" (checkbox)
 *   - HB 9 exemption: "3. Value is not more than 125,000" (checkbox)
 *   - Business type: "2.1 Type of Business" through "2.14 Years at this location"
 *
 * Page 2: Fixed asset cost grid + inventory section + leased property
 *   - Grid: 7 columns (A-G) x year rows
 *     Column A: Furniture Fixtures
 *     Column B: Office Machines
 *     Column C: Mobile Radio Telephone PBX Cell Phone Fax
 *     Column D: All other Machinery Equipment
 *     Column E: Computers PCs Servers Peripherals
 *     Column F: Computers Mainframes
 *     Column G: Miscellaneous signs rental inventory etc
 *
 *   - Year row field naming pattern:
 *     Column A: field name is just the year, e.g., "2019"
 *     Column B: "{year}-0", e.g., "2019-0"
 *     Column C: "{year}-1"
 *     Column D: "{year}-2"
 *     Column E: "{year}-3"
 *     Column F: "{year}-4"
 *     Column G: "{year}-5"
 *
 *   - Year rows on the 2026 form: 2005 through 2026 (22 rows)
 *     Prior years are captured in the earliest row (2005 = "Prior & 2005")
 *
 *   - Column totals: "Cost Totals A" through "Cost Totals G", "Cost Totals H" (grand total)
 *
 *   - Inventory section (monthly):
 *     "A Inventory" through "A Inventory-5" (6 fields for months)
 *     "B Raw Materials" through "B Raw Materials-5"
 *     "C Work in Process" through "C Work in Process-5"
 *     "D Supplies" through "D Supplies-5"
 *     Totals: "Total Inventory" through "Total Inventory-5"
 *
 *   - Leased property: 3 rows
 *     "Property Owners Name", "Property Owners Name-0", "Property Owners Name-1" (and -2)
 *     "Property Owners Address", etc.
 *     "General Property Description", etc.
 *
 * Our category -> Harris County column mapping:
 *   furniture_fixtures    -> A (Furniture Fixtures)
 *   office_equipment      -> B (Office Machines)
 *   telecommunications    -> C (Mobile Radio/Telephone/PBX/Cell/Fax)
 *   machinery_equipment   -> D (All other Machinery Equipment)
 *   medical_equipment     -> D (All other Machinery Equipment)
 *   restaurant_equipment  -> D (All other Machinery Equipment)
 *   tools_dies            -> D (All other Machinery Equipment)
 *   computer_equipment    -> E (Computers PCs Servers Peripherals)
 *   software              -> E (Computers PCs Servers Peripherals)
 *   vehicles              -> G (Miscellaneous)
 *   leasehold_improvements-> G (Miscellaneous)
 *   leased_equipment      -> G (Miscellaneous)
 *   signs_displays        -> G (Miscellaneous)
 *   other                 -> G (Miscellaneous)
 *   inventory             -> Inventory section (not cost grid)
 *   supplies              -> Inventory section (D Supplies)
 */

/** Our asset category -> Harris County column letter (A-G) */
const CATEGORY_TO_COLUMN: Record<string, string> = {
  furniture_fixtures: 'A',
  office_equipment: 'B',
  telecommunications: 'C',
  machinery_equipment: 'D',
  medical_equipment: 'D',
  restaurant_equipment: 'D',
  tools_dies: 'D',
  computer_equipment: 'E',
  software: 'E',
  vehicles: 'G',
  leasehold_improvements: 'G',
  leased_equipment: 'G',
  signs_displays: 'G',
  other: 'G',
};

/**
 * Column letter -> field suffix for year rows.
 * Column A uses just the year as field name (e.g., "2019").
 * Columns B-G use "{year}-{offset}" (e.g., "2019-0" for B).
 */
const COLUMN_FIELD_SUFFIX: Record<string, number | null> = {
  A: null, // No suffix, field name is just the year
  B: 0,
  C: 1,
  D: 2,
  E: 3,
  F: 4,
  G: 5,
};

/** Column letter -> total field name */
const COLUMN_TOTAL_FIELD: Record<string, string> = {
  A: 'Cost Totals A',
  B: 'Cost Totals B',
  C: 'Cost Totals C',
  D: 'Cost Totals D',
  E: 'Cost Totals E',
  F: 'Cost Totals F',
  G: 'Cost Totals G',
};

/** The earliest year row on the form (captures "Prior & {year}") */
const EARLIEST_YEAR = 2005;

/** The latest year row on the form (current tax year) */
const LATEST_YEAR = 2026;

export class TxHarrisFormStrategy implements FormStrategy {
  readonly strategyId = 'tx-harris-22.15';
  readonly formName = 'TX Harris County Form 22.15';

  async fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult> {
    const templateBytes = loadTemplate('tx-harris-22.15.pdf');
    const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    this.fillOwnerInfo(form, owner);
    this.fillHb9Checkbox(form, calculation);
    this.fillAssetGrid(form, calculation);
    this.fillInventorySection(form, calculation);
    this.fillLeasedEquipment(form, owner, calculation);

    try {
      form.flatten();
    } catch {
      // Flatten can crash on government PDFs -- save with editable fields
    }

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, formName: this.formName };
  }

  private fillOwnerInfo(form: PDFForm, owner: OwnerInfo): void {
    setFieldSafe(form, '1.1 Business Name', owner.name);
    setFieldSafe(form, '1.2 Business Owner', owner.contactName ?? owner.name);
    setFieldSafe(
      form,
      '1.3 Mailing Address City State Zip Code',
      `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip}`,
    );
    setFieldSafe(
      form,
      '1.4 Property Location Address City State Zip Code',
      `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip}`,
    );
    if (owner.phone) {
      setFieldSafe(form, '1.5 Phone area code and number', owner.phone);
    }
    if (owner.accountNumber) {
      setFieldSafe(form, 'Account Number', owner.accountNumber);
    }
    if (owner.ein) {
      setFieldSafe(form, '2.5 Federal Employer ID Number', owner.ein);
    }
  }

  private fillHb9Checkbox(form: PDFForm, calculation: CalculationResult): void {
    const totalValue = calculation.grandTotalDepreciatedValue;

    // Check the HB 9 box if value is $125K or less
    if (totalValue <= 125_000) {
      setCheckboxSafe(form, '3. Value is not more than 125,000', true);
    }

    // Related business entities
    if (calculation.hb9?.hasRelatedEntities) {
      setCheckboxSafe(form, 'BusinessRelatedtoOthers', true);
    }
  }

  /**
   * Fill the fixed asset cost grid on Page 2.
   *
   * Harris County form uses actual calendar years for row labels (2005-2026),
   * unlike the standard 50-144 which uses year-of-life.
   * Assets acquired before 2005 are grouped into the 2005 row.
   *
   * Each cell gets the ORIGINAL COST (not depreciated value) - the appraisal
   * district applies their own depreciation. This matches standard 50-144 behavior
   * where HCWN = Historical Cost When New.
   */
  private fillAssetGrid(form: PDFForm, calculation: CalculationResult): void {
    // Build a grid: column -> year -> cost
    const grid: Record<string, Record<number, number>> = {};
    const columnTotals: Record<string, number> = {};

    for (const [category, catData] of Object.entries(calculation.byCategory)) {
      // Skip inventory/supplies - they go in inventory section
      if (category === 'inventory' || category === 'supplies') continue;

      const column = CATEGORY_TO_COLUMN[category];
      if (!column) continue;

      if (!grid[column]) grid[column] = {};
      if (!columnTotals[column]) columnTotals[column] = 0;

      for (const [yearStr, yearData] of Object.entries(catData.byYear)) {
        const acqYear = parseInt(yearStr, 10);
        // Clamp to form's year range: anything before EARLIEST_YEAR goes into EARLIEST_YEAR row
        const formYear = Math.max(EARLIEST_YEAR, Math.min(acqYear, LATEST_YEAR));

        if (!grid[column][formYear]) grid[column][formYear] = 0;
        grid[column][formYear] += yearData.originalCost;
        columnTotals[column] += yearData.originalCost;
      }
    }

    // Write grid values to form fields
    let grandTotal = 0;

    for (const [column, yearCosts] of Object.entries(grid)) {
      const suffix = COLUMN_FIELD_SUFFIX[column];

      for (const [yearStr, cost] of Object.entries(yearCosts)) {
        if (cost <= 0) continue;
        const year = parseInt(yearStr, 10);

        // Build field name based on column
        const fieldName = suffix === null
          ? String(year)                // Column A: just "2019"
          : `${year}-${suffix}`;        // Columns B-G: "2019-0", "2019-1", etc.

        setFieldSafe(form, fieldName, formatCurrency(cost));
      }

      // Column total
      const totalField = COLUMN_TOTAL_FIELD[column];
      if (totalField && columnTotals[column]) {
        setFieldSafe(form, totalField, formatCurrency(columnTotals[column]));
        grandTotal += columnTotals[column];
      }
    }

    // Grand total (all columns combined)
    if (grandTotal > 0) {
      setFieldSafe(form, 'Cost Totals H', formatCurrency(grandTotal));
    }
  }

  /**
   * Fill the inventory section.
   * Harris County wants monthly inventory values; we only have totals,
   * so we fill the annual average across all months.
   */
  private fillInventorySection(form: PDFForm, calculation: CalculationResult): void {
    const invData = calculation.byCategory['inventory'];
    const supData = calculation.byCategory['supplies'];

    if (invData) {
      const invValue = formatCurrency(invData.totalOriginalCost);
      // Fill all 6 month fields with the same value (annual snapshot)
      setFieldSafe(form, 'A Inventory', invValue);
      for (let i = 0; i < 5; i++) {
        setFieldSafe(form, `A Inventory-${i}`, invValue);
      }
    }

    if (supData) {
      const supValue = formatCurrency(supData.totalOriginalCost);
      setFieldSafe(form, 'D Supplies', supValue);
      for (let i = 0; i < 5; i++) {
        setFieldSafe(form, `D Supplies-${i}`, supValue);
      }
    }
  }

  /**
   * Fill leased equipment section if any leased assets exist.
   */
  private fillLeasedEquipment(
    form: PDFForm,
    _owner: OwnerInfo,
    calculation: CalculationResult,
  ): void {
    const leasedData = calculation.byCategory['leased_equipment'];
    if (!leasedData || leasedData.assetCount === 0) return;

    // We have aggregate data but not individual lessor info from calculation.
    // Fill first row with a summary description.
    setFieldSafe(
      form,
      'General Property Description',
      `Leased Equipment (${leasedData.assetCount} items) - Total Cost: ${formatCurrency(leasedData.totalOriginalCost)}`,
    );
  }
}
