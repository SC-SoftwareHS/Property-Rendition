import { PDFDocument, PDFForm } from 'pdf-lib';
import { FormStrategy, FormStrategyResult, OwnerInfo } from './form-strategy.interface';
import { CalculationResult } from '../../depreciation/depreciation.service';
import { setFieldSafe, formatCurrency, loadTemplate } from './shared-utils';

/**
 * Florida DR-405 Tangible Personal Property Tax Return field mapping strategy.
 *
 * The form has 334 named interactive fields across 4 pages:
 *
 * Page 1: Owner info + Lines 10-25 (asset category summary)
 *   - Owner: "1 Owner or person in charge", "Business name", "Name and address",
 *     "Phone", "Acct #", "Tax year", "County Combo Box4" (dropdown)
 *   - Lines 10-25: Two columns per line — Original Installed Cost + Taxpayer's FMV
 *     Fields: Text14-Text43 map to Lines 10-25 cost/value pairs
 *   - Totals: "Total Original Installed Cost", "Total Taxpayer's Estimate"
 *   - Condition dropdowns: Dropdown52-67 (good/avg/poor per line)
 *
 * Pages 2-4: Detail schedules
 *   - Additions/improvements (Enter line number, description, age, year, FMV, cost)
 *   - Disposals (description, age, year, original cost, disposed to whom)
 *   - Leased-in equipment (owner/lessor, description, year, rent, cost)
 *   - Leased-out equipment (lease#, lessee, description, age, year, rent, term, FMV, cost)
 *
 * DR-405 Line → Text field mapping (Page 1):
 *   Line 10 (Office F&F):              Text14 (cost), Text15 (value)
 *   Line 11 (EDP/Computers):           Text16 (cost), Text17 (value)
 *   Line 12 (Store/Restaurant):        Text18 (cost), Text19 (value)
 *   Line 13 (Machinery/Mfg):           Text20 (cost), Text21 (value)
 *   Line 14 (Farm/Grove/Dairy):        Text22 (cost), Text23 (value)
 *   Line 15 (Professional/Medical):    Text24 (cost), Text50 (value)
 *   Line 16 (Hotel/Motel):             Text26 (cost), Text27 (value)
 *   Line 16a (Rental units):           Text28 (cost), Text29 (value)
 *   Line 17 (Mobile home attach):      Text30 (cost), Text31 (value)
 *   Line 18 (Service station):         Text32 (cost), Text33 (value)
 *   Line 19 (Signs):                   Text34 (cost), Text35 (value)
 *   Line 20 (Leasehold improvements):  Text36 (cost), Text37 (value)
 *   Line 21 (Pollution control):       Text38 (cost), Text39 (value)
 *   Line 22 (Equip rented/leased):     Text40 (cost), Text41 (value)
 *   Line 23 (Supplies):                Text42 (cost), Text43 (value)
 *   Line 24 (Renewable energy):        Text51 (cost), Text53 (value)
 *   Line 25 (Other):                   Text85 (cost), Text86 (value)
 *
 * Our category → DR-405 Line mapping:
 *   furniture_fixtures     → Line 10 (Office furniture, machines, library)
 *   computer_equipment     → Line 11 (EDP equipment, computers)
 *   machinery_equipment    → Line 13 (Machinery and manufacturing)
 *   leasehold_improvements → Line 20 (Leasehold improvements)
 *   vehicles               → Line 25 (Other — unlicensed only; licensed exempt)
 *   inventory              → EXEMPT in FL (§192.001(11)(d)) — not on form
 *   supplies               → Line 23 (Supplies not held for resale)
 *   leased_equipment       → Line 22 (Equipment owned but rented/leased/held by others)
 *   other                  → Line 25 (Other)
 *
 * FL-specific notes:
 * - Inventory is EXEMPT — not reported on DR-405
 * - Licensed vehicles are NOT reported
 * - $25,000 automatic TPP exemption per return
 * - Filing deadline: April 1
 */

/** Our asset category → DR-405 line number */
const CATEGORY_TO_LINE: Record<string, number> = {
  furniture_fixtures: 10,
  office_equipment: 10,
  computer_equipment: 11,
  telecommunications: 11,
  software: 11,
  restaurant_equipment: 12,
  machinery_equipment: 13,
  tools_dies: 13,
  medical_equipment: 15,
  signs_displays: 19,
  leasehold_improvements: 20,
  leased_equipment: 22,
  supplies: 23,
  vehicles: 25,
  other: 25,
};

/**
 * DR-405 Line → (cost field, value field) mapping.
 * Fields identified from PDF enumeration of fl-dr-405.pdf.
 */
const LINE_FIELD_MAP: Record<number, { costField: string; valueField: string }> = {
  10: { costField: 'Text14', valueField: 'Text15' },
  11: { costField: 'Text16', valueField: 'Text17' },
  12: { costField: 'Text18', valueField: 'Text19' },
  13: { costField: 'Text20', valueField: 'Text21' },
  14: { costField: 'Text22', valueField: 'Text23' },
  15: { costField: 'Text24', valueField: 'Text50' },
  16: { costField: 'Text26', valueField: 'Text27' },
  // 16a: { costField: 'Text28', valueField: 'Text29' },
  17: { costField: 'Text30', valueField: 'Text31' },
  18: { costField: 'Text32', valueField: 'Text33' },
  19: { costField: 'Text34', valueField: 'Text35' },
  20: { costField: 'Text36', valueField: 'Text37' },
  21: { costField: 'Text38', valueField: 'Text39' },
  22: { costField: 'Text40', valueField: 'Text41' },
  23: { costField: 'Text42', valueField: 'Text43' },
  24: { costField: 'Text51', valueField: 'Text53' },
  25: { costField: 'Text85', valueField: 'Text86' },
};

export class FlDr405Strategy implements FormStrategy {
  readonly strategyId = 'fl-dr-405';
  readonly formName = 'FL DR-405';

  async fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult> {
    const templateBytes = loadTemplate('fl-dr-405.pdf');
    const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    this.fillOwnerInfo(form, owner, calculation);
    this.fillAssetLines(form, calculation);

    try {
      form.flatten();
    } catch {
      // Flatten can crash on government PDFs — save with editable fields
    }

    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, formName: this.formName };
  }

  private fillOwnerInfo(
    form: PDFForm,
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): void {
    setFieldSafe(form, '1 Owner or person in charge', owner.name);
    setFieldSafe(form, 'Business name', owner.name);
    setFieldSafe(form, 'Name and address', `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip}`);
    if (owner.phone) setFieldSafe(form, 'Phone', owner.phone);
    if (owner.accountNumber) setFieldSafe(form, 'Acct #', owner.accountNumber);
    setFieldSafe(form, 'Tax year', String(calculation.taxYear));

    // Set county dropdown if available
    if (owner.county) {
      this.setCountyDropdown(form, owner.county);
    }

    // Preparer info
    if (owner.contactName) {
      setFieldSafe(form, 'someone other than the taxpayer the preparer signing this return certifies that this declaration is based on all information he or', owner.contactName);
    }
    if (owner.ein) setFieldSafe(form, 'Identification Number', owner.ein);
  }

  /**
   * Try to select the county in the dropdown. FL county names in the dropdown
   * have trailing spaces (e.g., "Alachua "), so we try to match loosely.
   */
  private setCountyDropdown(form: PDFForm, county: string): void {
    try {
      const dropdown = form.getDropdown('County Combo Box4');
      const options = dropdown.getOptions();
      const match = options.find(
        (opt) => opt.trim().toLowerCase() === county.trim().toLowerCase(),
      );
      if (match) {
        dropdown.select(match);
      }
    } catch {
      // Dropdown doesn't exist or can't be set
    }
  }

  /**
   * Fill Lines 10-25 with aggregated category data.
   * Each line gets total original cost and total depreciated (FMV) value.
   */
  private fillAssetLines(form: PDFForm, calculation: CalculationResult): void {
    // Track which lines have been written to (for merging categories into same line)
    const lineTotals: Record<number, { cost: number; value: number }> = {};

    for (const [category, catData] of Object.entries(calculation.byCategory)) {
      // Skip inventory — exempt in FL
      if (category === 'inventory') continue;

      const line = CATEGORY_TO_LINE[category];
      if (!line) continue;

      if (!lineTotals[line]) {
        lineTotals[line] = { cost: 0, value: 0 };
      }

      lineTotals[line].cost += catData.totalOriginalCost;
      lineTotals[line].value += catData.totalDepreciatedValue;
    }

    let totalCost = 0;
    let totalValue = 0;

    for (const [lineStr, totals] of Object.entries(lineTotals)) {
      const line = parseInt(lineStr, 10);
      const fields = LINE_FIELD_MAP[line];
      if (!fields) continue;

      setFieldSafe(form, fields.costField, formatCurrency(totals.cost));
      setFieldSafe(form, fields.valueField, formatCurrency(totals.value));

      totalCost += totals.cost;
      totalValue += totals.value;
    }

    // Grand totals
    setFieldSafe(form, 'Total Original Installed Cost', formatCurrency(totalCost));
    setFieldSafe(form, 'Total Taxpayer\'s Estimate', formatCurrency(totalValue));
  }
}
