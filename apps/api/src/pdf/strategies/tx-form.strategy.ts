import { PDFDocument, PDFForm } from 'pdf-lib';
import { CalculationResult, CategorySummary } from '../../depreciation/depreciation.service';

/**
 * TX Form 50-144 field mapping strategy.
 *
 * The form is organized into sections:
 * - Page 1: Owner info, account info, leased property
 * - Schedule A (Section A): Furniture & Fixtures (15 year-rows)
 * - Schedule B (Section B): Machinery & Equipment (9 year-rows)
 * - Schedule C (Section C): Computer Equipment (6 year-rows)
 * - Schedule D (Section D): Vehicles / Boats / Aircraft (9 year-rows)
 * - Schedule E: Other categories broken into sub-schedules (EA-EJ)
 *
 * Each schedule has:
 *   - HCost fields for historical cost by year (e.g. AHCost1 = current year)
 *   - DValue fields for depreciated value by year (e.g. ADValue1)
 *   - A total field (e.g. A2Value)
 *
 * Year rows count DOWN from current year (row 1 = current tax year, row 2 = prior year).
 */

/** Category → PDF schedule section mapping */
const CATEGORY_SECTION: Record<string, string> = {
  furniture_fixtures: 'A',
  machinery_equipment: 'B',
  computer_equipment: 'C',
  vehicles: 'D',
  // Remaining categories go into Schedule E sub-sections
  // leasehold_improvements, inventory, supplies, leased_equipment, other
};

/** Max rows per section in the PDF form */
const SECTION_MAX_ROWS: Record<string, number> = {
  A: 15,
  B: 9,
  C: 6,
  D: 9,
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
  if (owner.accountNumber) setFieldSafe(form, 'G1', owner.accountNumber);

  // Tax year
  const taxYearStr = String(calculation.taxYear);
  setFieldSafe(form, 'CurrYear1', taxYearStr);
  setFieldSafe(form, 'CurrYear2', taxYearStr);
  setFieldSafe(form, 'CurrYear3', taxYearStr);

  let grandTotalCost = 0;
  let grandTotalValue = 0;

  // --- Fill Schedules A-D (main categories) ---
  for (const [category, section] of Object.entries(CATEGORY_SECTION)) {
    const catData = calculation.byCategory[category];
    if (!catData) continue;

    const maxRows = SECTION_MAX_ROWS[section] ?? 10;
    const result = fillScheduleSection(form, section, catData, calculation.taxYear, maxRows);
    grandTotalCost += result.totalCost;
    grandTotalValue += result.totalValue;
  }

  // --- Fill Schedule E sub-sections for remaining categories ---
  // Map remaining categories to Schedule E sub-sections
  const scheduleECategories: Record<string, string> = {
    leasehold_improvements: 'EA',
    inventory: 'EB',
    supplies: 'EC',
    leased_equipment: 'ED',
    other: 'EE',
  };

  // Schedule E sub-sections have different max rows
  const scheduleEMaxRows: Record<string, number> = {
    EA: 5, EB: 6, EC: 8, ED: 9, EE: 11,
  };

  for (const [category, subSection] of Object.entries(scheduleECategories)) {
    const catData = calculation.byCategory[category];
    if (!catData) continue;

    const maxRows = scheduleEMaxRows[subSection] ?? 10;
    const result = fillScheduleESection(form, subSection, catData, calculation.taxYear, maxRows);
    grandTotalCost += result.totalCost;
    grandTotalValue += result.totalValue;

    // Set sub-section total
    setFieldSafe(form, subSection, formatCurrency(result.totalValue));
  }

  // Schedule E total
  const eTotal = Object.keys(scheduleECategories).reduce((sum, cat) => {
    return sum + (calculation.byCategory[cat]?.totalDepreciatedValue ?? 0);
  }, 0);
  if (eTotal > 0) {
    setFieldSafe(form, 'E2Value', formatCurrency(eTotal));
  }

  // Grand totals (F2 is supplies/other total, G2Value is total of everything)
  setFieldSafe(form, 'G2Value', formatCurrency(calculation.grandTotalDepreciatedValue));
}

function fillScheduleSection(
  form: PDFForm,
  section: string,
  catData: CategorySummary,
  taxYear: number,
  maxRows: number,
): { totalCost: number; totalValue: number } {
  // Sort year groups by acquisition year descending (most recent first)
  const yearEntries = Object.entries(catData.byYear)
    .map(([year, data]) => ({ year: parseInt(year, 10), data }))
    .sort((a, b) => b.year - a.year);

  let totalCost = 0;
  let totalValue = 0;

  for (let i = 0; i < Math.min(yearEntries.length, maxRows); i++) {
    const rowNum = i + 1;
    const entry = yearEntries[i];

    setFieldSafe(form, `${section}HCost${rowNum}`, formatCurrency(entry.data.originalCost));
    setFieldSafe(form, `${section}DValue${rowNum}`, formatCurrency(entry.data.depreciatedValue));

    totalCost += entry.data.originalCost;
    totalValue += entry.data.depreciatedValue;
  }

  // Section total
  setFieldSafe(form, `${section}2Value`, formatCurrency(totalValue));

  return { totalCost, totalValue };
}

function fillScheduleESection(
  form: PDFForm,
  subSection: string,
  catData: CategorySummary,
  taxYear: number,
  maxRows: number,
): { totalCost: number; totalValue: number } {
  const yearEntries = Object.entries(catData.byYear)
    .map(([year, data]) => ({ year: parseInt(year, 10), data }))
    .sort((a, b) => b.year - a.year);

  let totalCost = 0;
  let totalValue = 0;

  for (let i = 0; i < Math.min(yearEntries.length, maxRows); i++) {
    const rowNum = i + 1;
    const entry = yearEntries[i];

    setFieldSafe(form, `${subSection}HCost${rowNum}`, formatCurrency(entry.data.originalCost));
    setFieldSafe(form, `${subSection}DValue${rowNum}`, formatCurrency(entry.data.depreciatedValue));

    totalCost += entry.data.originalCost;
    totalValue += entry.data.depreciatedValue;
  }

  return { totalCost, totalValue };
}
