/**
 * TX Comptroller BPP Depreciation Schedule — 2025 SDPVS
 *
 * Source: https://comptroller.texas.gov/taxes/property-tax/docs/bpp-depreciation.pdf
 * Title: "Business Personal Property Depreciation Schedule 2025 School District Property Value Study (SDPVS)"
 *
 * The Comptroller publishes percent-good tables keyed by PTAD Economic Life
 * (2yr, 3yr, 4yr, 5yr, 6yr, 7yr, 8yr, 10yr, 11yr, 12yr, 14yr, 15yr, 20yr, 30yr).
 * Values are decimals (e.g. 0.85 = 85% of original cost).
 *
 * Our asset categories map to PTAD life categories as follows:
 *   computer_equipment     → 5yr
 *   furniture_fixtures     → 10yr
 *   machinery_equipment    → 12yr
 *   leasehold_improvements → 15yr
 *   vehicles               → 6yr
 *   inventory              → 1yr (always 100%, no depreciation)
 *   supplies               → 1yr (always 100%, no depreciation)
 *   leased_equipment       → 10yr
 *   other                  → 10yr
 *
 * Year of Life: 1 = acquired in the current tax year, 2 = acquired 1 year ago, etc.
 * The table below was transcribed from Year Acquired rows (2024=Y1, 2023=Y2, ...).
 * Empty cells in the original PDF mean the asset has reached its floor/minimum —
 * we use the last non-empty value as the floor for all subsequent years.
 */

export type DepreciationEntry = {
  state: string;
  category: string;
  yearOfLife: number;
  depreciationPercent: string; // stored as decimal string for numeric(5,2)
  sourceDocument: string;
  sourceYear: number;
};

const SOURCE_DOCUMENT = 'TX Comptroller BPP Depreciation Schedule 2025 SDPVS';
const SOURCE_YEAR = 2025;

/**
 * Raw percent-good values by PTAD Economic Life category.
 * Key = PTAD life (e.g. "5yr"), Value = array of percent-good by year of life.
 * Index 0 = Year 1, Index 1 = Year 2, etc.
 * Values are percentages (85 = 85%).
 *
 * Transcribed directly from the 2025 SDPVS PDF.
 * Empty cells after the last value mean the floor has been reached — the last value
 * in each array IS the floor for that life category.
 */
const TX_PERCENT_GOOD: Record<string, number[]> = {
  // PTAD 2yr life
  '2yr': [40, 20, 10],
  // PTAD 3yr life
  '3yr': [78, 56, 35, 13, 10],
  // PTAD 4yr life
  '4yr': [83, 66, 49, 32, 15, 10],
  // PTAD 5yr life
  '5yr': [85, 70, 55, 40, 25, 10],
  // PTAD 6yr life
  '6yr': [87, 74, 61, 48, 35, 22, 10],
  // PTAD 7yr life
  '7yr': [89, 78, 67, 56, 45, 34, 23, 12, 10],
  // PTAD 8yr life
  '8yr': [90, 80, 70, 60, 50, 40, 30, 20, 10],
  // PTAD 10yr life
  '10yr': [91, 82, 73, 64, 55, 46, 37, 28, 19, 10],
  // PTAD 11yr life
  '11yr': [92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 10],
  // PTAD 12yr life
  '12yr': [93, 86, 79, 72, 65, 58, 51, 44, 37, 30, 23, 16, 10],
  // PTAD 14yr life
  '14yr': [94, 88, 82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22, 16, 10],
  // PTAD 15yr life
  '15yr': [
    95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20,
  ],
  // PTAD 20yr life
  '20yr': [
    96, 92, 88, 84, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36, 32,
    28, 27, 26, 25,
  ],
  // PTAD 30yr life (included for completeness, not mapped to a category currently)
  '30yr': [
    97, 94, 91, 88, 85, 83, 81, 79, 77, 75, 73, 71, 69, 67, 65, 63, 61,
    59, 57, 55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33,
  ],
};

/**
 * Map our asset_category enum values to PTAD Economic Life categories.
 *
 * inventory and supplies always report at 100% (full cost, no depreciation).
 * They get a single yearOfLife=1 entry at 100%.
 */
const CATEGORY_TO_PTAD_LIFE: Record<string, string> = {
  computer_equipment: '5yr',
  furniture_fixtures: '10yr',
  machinery_equipment: '12yr',
  leasehold_improvements: '15yr',
  vehicles: '6yr',
  leased_equipment: '10yr',
  other: '10yr',
  office_equipment: '10yr',
  medical_equipment: '8yr',
  restaurant_equipment: '8yr',
  telecommunications: '5yr',
  software: '3yr',
  tools_dies: '7yr',
  signs_displays: '7yr',
};

function buildEntries(): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];

  // Standard depreciating categories
  for (const [category, ptadLife] of Object.entries(CATEGORY_TO_PTAD_LIFE)) {
    const percentGoods = TX_PERCENT_GOOD[ptadLife];
    if (!percentGoods) {
      throw new Error(`No percent-good data for PTAD life ${ptadLife}`);
    }

    for (let i = 0; i < percentGoods.length; i++) {
      entries.push({
        state: 'TX',
        category,
        yearOfLife: i + 1,
        depreciationPercent: percentGoods[i].toFixed(2),
        sourceDocument: SOURCE_DOCUMENT,
        sourceYear: SOURCE_YEAR,
      });
    }
  }

  // Inventory: always 100% of cost
  entries.push({
    state: 'TX',
    category: 'inventory',
    yearOfLife: 1,
    depreciationPercent: '100.00',
    sourceDocument: SOURCE_DOCUMENT,
    sourceYear: SOURCE_YEAR,
  });

  // Supplies: always 100% of cost
  entries.push({
    state: 'TX',
    category: 'supplies',
    yearOfLife: 1,
    depreciationPercent: '100.00',
    sourceDocument: SOURCE_DOCUMENT,
    sourceYear: SOURCE_YEAR,
  });

  return entries;
}

export const txDepreciation = buildEntries();
