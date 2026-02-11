import { PDFForm } from 'pdf-lib';
import { CalculationResult, CategorySummary } from '../../depreciation/depreciation.service';

/**
 * TX Form 50-144 field mapping strategy.
 *
 * The form has 632 named interactive fields across 6 pages:
 *
 * Page 1: Owner info (Text1-Text6, Text9=account#), tax year, checkboxes
 * Page 2: Schedules A-D side-by-side (same rows, different columns)
 *   - Schedule A (Furniture & Fixtures): 15 rows — AHCost1-15, ADValue1-15
 *   - Schedule B (Machinery & Equipment): 9 rows — BHCost1-9, BDValue1-9
 *   - Schedule C (Computer Equipment): 6 rows — CHCost1-6, CDValue1-6
 *   - Schedule D (Vehicles): 9 rows — DHCost1-9, DDValue1-9
 *   - Year labels: DatePrinted(row1), DatePrinted1(row2)...DatePrinted13(row14)
 *   - Section totals: A2/A2Value, B2/B2Value, C2/C2Value, D2/D2Value
 *   - Row N = tax year - (N-1). Row 1 = current year, Row 2 = prior year, etc.
 *
 * Pages 3-4: Schedule E with 10 sub-sections (EA-EJ):
 *   Upper half: EA(5), EB(6), EC(8), ED(9), EE(11)
 *   Lower half: EF(12), EG(15), EH(18), EI(23), EJ(30)
 *   Year labels: yy/yy2+ fields mapped per sub-section
 *
 * Page 2 bottom: Grand totals — G2Value (total depreciated), G2 (total cost)
 */

/** Category → PDF schedule section mapping */
const CATEGORY_SECTION: Record<string, string> = {
  furniture_fixtures: 'A',
  machinery_equipment: 'B',
  computer_equipment: 'C',
  vehicles: 'D',
};

/** Max rows per section in the PDF form */
const SECTION_MAX_ROWS: Record<string, number> = {
  A: 15,
  B: 9,
  C: 6,
  D: 9,
};

/**
 * Schedule E category → sub-section mapping.
 * We map our 5 asset categories across the 10 available sub-sections (EA-EJ).
 * Currently using EA-EE; EF-EJ are available for future expansion.
 */
const SCHEDULE_E_CATEGORIES: Record<string, string> = {
  leasehold_improvements: 'EA',
  inventory: 'EB',
  supplies: 'EC',
  leased_equipment: 'ED',
  other: 'EE',
};

/** Max rows per Schedule E sub-section */
const SCHEDULE_E_MAX_ROWS: Record<string, number> = {
  EA: 5, EB: 6, EC: 8, ED: 9, EE: 11,
  EF: 12, EG: 15, EH: 18, EI: 23, EJ: 30,
};

export interface OwnerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  ein?: string;
  accountNumber?: string;
}

function setFieldSafe(form: PDFForm, fieldName: string, value: string) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch {
    // Field doesn't exist or wrong type — skip silently
  }
}

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export function fillTxForm(
  form: PDFForm,
  owner: OwnerInfo,
  calculation: CalculationResult,
) {
  // --- Page 1: Owner info ---
  setFieldSafe(form, 'Text1', owner.name);
  setFieldSafe(form, 'Text2', owner.address);
  setFieldSafe(form, 'Text3', `${owner.city}, ${owner.state} ${owner.zip}`);
  if (owner.phone) setFieldSafe(form, 'Text4', owner.phone);
  if (owner.ein) setFieldSafe(form, 'Text6', owner.ein);
  if (owner.accountNumber) setFieldSafe(form, 'Text9', owner.accountNumber);

  // Tax year
  const taxYear = calculation.taxYear;
  const taxYearStr = String(taxYear);
  setFieldSafe(form, 'CurrYear1', taxYearStr);
  setFieldSafe(form, 'CurrYear2', taxYearStr);
  setFieldSafe(form, 'CurrYear3', taxYearStr);

  // Year labels for Schedules A-D and E are pre-filled in the template.
  // No need to fill DatePrinted/yr/yy fields — they already have correct values.

  let grandTotalCost = 0;
  let grandTotalValue = 0;

  // --- Fill Schedules A-D (main categories) ---
  for (const [category, section] of Object.entries(CATEGORY_SECTION)) {
    const catData = calculation.byCategory[category];
    if (!catData) continue;

    const maxRows = SECTION_MAX_ROWS[section] ?? 10;
    const result = fillScheduleSection(form, section, catData, taxYear, maxRows);
    grandTotalCost += result.totalCost;
    grandTotalValue += result.totalValue;
  }

  // --- Fill Schedule E sub-sections for remaining categories ---
  let eTotalCost = 0;
  let eTotalValue = 0;

  for (const [category, subSection] of Object.entries(SCHEDULE_E_CATEGORIES)) {
    const catData = calculation.byCategory[category];
    if (!catData) continue;

    const maxRows = SCHEDULE_E_MAX_ROWS[subSection] ?? 10;
    const result = fillScheduleESection(form, subSection, catData, taxYear, maxRows);
    grandTotalCost += result.totalCost;
    grandTotalValue += result.totalValue;
    eTotalCost += result.totalCost;
    eTotalValue += result.totalValue;

    // Set sub-section total
    setFieldSafe(form, subSection, formatCurrency(result.totalValue));
  }

  // Schedule E total
  if (eTotalValue > 0) {
    setFieldSafe(form, 'E2Value', formatCurrency(eTotalValue));
    setFieldSafe(form, 'E2', formatCurrency(eTotalCost));
  }

  // --- Grand totals ---
  setFieldSafe(form, 'G2Value', formatCurrency(calculation.grandTotalDepreciatedValue));
  setFieldSafe(form, 'G2', formatCurrency(calculation.grandTotalOriginalCost));
}

/**
 * Fill a Schedule A-D section with year-grouped asset data.
 *
 * Assets are placed in the row matching their acquisition year:
 *   Row N = taxYear - acquisitionYear
 * Row 1 = prior year (e.g. 2025 for tax year 2026).
 * Current-year acquisitions (row 0) are placed in row 1.
 */
function fillScheduleSection(
  form: PDFForm,
  section: string,
  catData: CategorySummary,
  taxYear: number,
  maxRows: number,
): { totalCost: number; totalValue: number } {
  let totalCost = 0;
  let totalValue = 0;

  for (const [yearStr, data] of Object.entries(catData.byYear)) {
    const acquisitionYear = parseInt(yearStr, 10);
    let rowNum = taxYear - acquisitionYear;

    // Current-year acquisitions go in row 1
    if (rowNum <= 0) rowNum = 1;
    // Skip if row is out of range (too old)
    if (rowNum > maxRows) continue;

    setFieldSafe(form, `${section}HCost${rowNum}`, formatCurrency(data.originalCost));
    setFieldSafe(form, `${section}DValue${rowNum}`, formatCurrency(data.depreciatedValue));

    totalCost += data.originalCost;
    totalValue += data.depreciatedValue;
  }

  // Section totals (both cost and depreciated value)
  setFieldSafe(form, `${section}2Value`, formatCurrency(totalValue));
  setFieldSafe(form, `${section}2`, formatCurrency(totalCost));

  return { totalCost, totalValue };
}

/**
 * Fill a Schedule E sub-section with year-grouped asset data.
 * Same year-to-row mapping as Schedules A-D.
 * Year labels are pre-filled in the template.
 */
function fillScheduleESection(
  form: PDFForm,
  subSection: string,
  catData: CategorySummary,
  taxYear: number,
  maxRows: number,
): { totalCost: number; totalValue: number } {
  let totalCost = 0;
  let totalValue = 0;

  for (const [yearStr, data] of Object.entries(catData.byYear)) {
    const acquisitionYear = parseInt(yearStr, 10);
    let rowNum = taxYear - acquisitionYear;

    // Current-year acquisitions go in row 1
    if (rowNum <= 0) rowNum = 1;
    if (rowNum > maxRows) continue;

    setFieldSafe(form, `${subSection}HCost${rowNum}`, formatCurrency(data.originalCost));
    setFieldSafe(form, `${subSection}DValue${rowNum}`, formatCurrency(data.depreciatedValue));

    totalCost += data.originalCost;
    totalValue += data.depreciatedValue;
  }

  return { totalCost, totalValue };
}
