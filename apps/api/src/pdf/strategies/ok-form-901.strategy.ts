import { PDFDocument, PDFForm } from 'pdf-lib';
import { FormStrategy, FormStrategyResult, OwnerInfo } from './form-strategy.interface';
import { CalculationResult, CategorySummary } from '../../depreciation/depreciation.service';
import { setFieldSafe, setCheckboxSafe, formatCurrency, loadTemplate } from './shared-utils';

/**
 * Oklahoma Form 901 field mapping strategy.
 *
 * The form has 147 named interactive fields across 2 pages:
 *
 * Page 1: Owner info, property details, parts 1-6
 *   - Owner fields: "Owners Name/DBA", "Mailing Address", "City, State, ZIP",
 *     "County", "Pers Prop #", "Phone Number", "Email Address", "Real Estate #"
 *   - Part 1 checkboxes: "1-10" (type of business)
 *   - Part 2 (fixed assets): 8 category rows × 4 columns
 *     Row fields: 2-{rowNum}-{colNum} where:
 *       Row 11 = Leasehold Improvements
 *       Row 12 = Furniture & Fixtures
 *       Row 13 = Electronic Equipment
 *       Row 14 = Computer Equipment
 *       Row 15 = Machinery & Equipment
 *       Row 16 = Forklifts & Construction Equipment
 *       Row 17 = Tooling, Dies & Molds
 *       Row 18 = Other Assets & Trade Tools
 *     Columns: 1=Description, 2=Year Acquired, 3=Original Cost, 4=Fair Market Value
 *     Totals: 2-19-1 (Total Orig Cost), 2-21-1 (Total FMV)
 *     Additional: 2-5-1, 2-6-1 (licensed vehicles note), 2-8, 2-9, 2-10, 2-10-1, 2-10-2
 *   - Part 3 (inventory): 3-1 through 3-5
 *   - Part 4 (additions): 4-1-1 through 4-5-5 (5 rows × 5 cols), 4-6 (total), 4 (narrative)
 *   - Part 5 (deletions): 5-1-1 through 5-5-5, 5-6 (total)
 *   - Part 6 (monthly inventory): 6-1 through 6-13
 *
 * Page 2: Preparer info
 *   - "I, Name", "I am", "of", "County of"
 *   - "Preparer Address", "Preparer ID #", "Preparer Phone #"
 *
 * Our category → Form 901 row mapping:
 *   leasehold_improvements → Row 11
 *   furniture_fixtures     → Row 12
 *   computer_equipment     → Row 14 (note: we combine electronic + computer into Row 14)
 *   machinery_equipment    → Row 15
 *   vehicles               → Row 16 (forklifts/construction — unlicensed only)
 *   leased_equipment       → Row 18 (Other Assets — closest match)
 *   other                  → Row 18 (Other Assets)
 *
 * NOTE: Licensed vehicles (cars, trucks, semis) are NOT included on OK Form 901.
 * They are assessed separately through the Motor Vehicle Division.
 */

/** Our asset category → OK Form 901 Part 2 row number */
const CATEGORY_TO_ROW: Record<string, number> = {
  leasehold_improvements: 11,
  furniture_fixtures: 12,
  office_equipment: 12,
  restaurant_equipment: 12,
  telecommunications: 13,
  computer_equipment: 14,
  software: 14,
  machinery_equipment: 15,
  medical_equipment: 15,
  vehicles: 16,
  tools_dies: 17,
  leased_equipment: 18,
  signs_displays: 18,
  other: 18,
};

/** Row descriptions matching the form's printed labels */
const ROW_DESCRIPTIONS: Record<number, string> = {
  11: 'Leasehold Improvements',
  12: 'Furniture & Fixtures',
  13: 'Electronic Equipment',
  14: 'Computer Equipment',
  15: 'Machinery & Equipment',
  16: 'Forklifts & Construction Equip',
  17: 'Tooling, Dies & Molds',
  18: 'Other Assets & Trade Tools',
};

export class OkForm901Strategy implements FormStrategy {
  readonly strategyId = 'ok-form-901';
  readonly formName = 'OK Form 901';

  async fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult> {
    const templateBytes = loadTemplate('ok-form-901.pdf');
    const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    this.fillOwnerInfo(form, owner);
    this.fillPart2(form, calculation);
    this.fillInventory(form, calculation);

    try {
      form.flatten();
    } catch {
      // Flatten can crash on government PDFs — save with editable fields
    }

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, formName: this.formName };
  }

  private fillOwnerInfo(form: PDFForm, owner: OwnerInfo): void {
    setFieldSafe(form, 'Owners Name/DBA', owner.name);
    setFieldSafe(form, 'Mailing Address', owner.address);
    setFieldSafe(form, 'City, State, ZIP', `${owner.city}, ${owner.state} ${owner.zip}`);
    if (owner.county) setFieldSafe(form, 'County', owner.county);
    if (owner.phone) setFieldSafe(form, 'Phone Number', owner.phone);
    if (owner.ein) setFieldSafe(form, 'Pers Prop #', owner.ein);
    if (owner.contactEmail) setFieldSafe(form, 'Email Address', owner.contactEmail);
    if (owner.accountNumber) setFieldSafe(form, 'Real Estate #', owner.accountNumber);

    // Preparer info (CPA firm filling on behalf of client)
    if (owner.contactName) setFieldSafe(form, 'I, Name', owner.contactName);
  }

  /**
   * Fill Part 2: Fixed Assets.
   *
   * For each of our categories, we aggregate all years into a single row
   * on the form (Form 901 doesn't have year-by-year rows like TX 50-144).
   * Each row has 4 columns:
   *   Col 1: Description (category name)
   *   Col 2: Year range (earliest-latest acquisition year)
   *   Col 3: Original cost
   *   Col 4: Fair market value (depreciated)
   */
  private fillPart2(form: PDFForm, calculation: CalculationResult): void {
    let totalOrigCost = 0;
    let totalFmv = 0;

    // Track which rows we've already written to (for merging categories into same row)
    const rowTotals: Record<number, { cost: number; value: number; desc: string[]; years: number[] }> = {};

    for (const [category, catData] of Object.entries(calculation.byCategory)) {
      // Skip inventory/supplies — those go in Part 3
      if (category === 'inventory' || category === 'supplies') continue;

      const row = CATEGORY_TO_ROW[category];
      if (!row) continue;

      // Initialize row tracking if needed
      if (!rowTotals[row]) {
        rowTotals[row] = { cost: 0, value: 0, desc: [], years: [] };
      }

      const rt = rowTotals[row];
      rt.cost += catData.totalOriginalCost;
      rt.value += catData.totalDepreciatedValue;
      rt.desc.push(ROW_DESCRIPTIONS[row] ?? category);

      // Collect acquisition years for the year range
      for (const yearStr of Object.keys(catData.byYear)) {
        rt.years.push(parseInt(yearStr, 10));
      }
    }

    // Write aggregated rows to form
    for (const [rowStr, rt] of Object.entries(rowTotals)) {
      const row = parseInt(rowStr, 10);

      // Col 1: Description (use the form's default label)
      // Col 2: Year range
      if (rt.years.length > 0) {
        const minYear = Math.min(...rt.years);
        const maxYear = Math.max(...rt.years);
        const yearStr = minYear === maxYear ? String(minYear) : `${minYear}-${maxYear}`;
        setFieldSafe(form, `2-${row}-2`, yearStr);
      }

      // Col 3: Original cost
      setFieldSafe(form, `2-${row}-3`, formatCurrency(rt.cost));

      // Col 4: Fair market value
      setFieldSafe(form, `2-${row}-4`, formatCurrency(rt.value));

      totalOrigCost += rt.cost;
      totalFmv += rt.value;
    }

    // Part 2 totals
    setFieldSafe(form, '2-19-1', formatCurrency(totalOrigCost));
    setFieldSafe(form, '2-21-1', formatCurrency(totalFmv));
  }

  /**
   * Fill Part 3: Inventory.
   * Field 3-1 is "Total Cost of Inventory" — we fill with inventory + supplies total.
   */
  private fillInventory(form: PDFForm, calculation: CalculationResult): void {
    let inventoryTotal = 0;

    const invData = calculation.byCategory['inventory'];
    if (invData) inventoryTotal += invData.totalOriginalCost;

    const supData = calculation.byCategory['supplies'];
    if (supData) inventoryTotal += supData.totalOriginalCost;

    if (inventoryTotal > 0) {
      setFieldSafe(form, '3-1', formatCurrency(inventoryTotal));
    }
  }
}
