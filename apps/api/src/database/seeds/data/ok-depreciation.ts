/**
 * OK Tax Commission BPP Depreciation Schedule — 2025
 *
 * Source: OTC Business Personal Property Valuation Schedule 2025
 * URL: https://oklahoma.gov/content/dam/ok/en/tax/documents/resources/publications/ad-valorem/2025BusinessPersonalPropertyValuationSchedule.pdf
 * Title: "Depreciation - Fixtures and Equipment / Economic Life Depreciation - Percent Good"
 *
 * Oklahoma uses a two-step valuation:
 *   Market Value = Original Cost × Trending Factor × Percent Good
 *
 * However, our system stores a single "depreciationPercent" per (state, category, yearOfLife).
 * We apply the percent-good directly to original cost (no trending). This is a valid
 * simplification — trending adjusts for inflation in replacement cost, but CPAs filing
 * the 901 typically report original acquisition cost. The OTC form itself asks for
 * "Original Cost" and the assessor applies trending.
 *
 * Key differences from TX:
 * - 20% floor (vs TX 10% floor) — assets never depreciate below 20% of value
 * - Computer equipment: NO trending factor (trending = 1.0)
 * - Licensed vehicles are NOT included on Form 901 (assessed separately by Motor Vehicle Div)
 *   We still store vehicle depreciation for edge cases (unlicensed equipment)
 *
 * Category → OTC Economic Life mapping:
 *   computer_equipment     → 5yr  (no trending)
 *   furniture_fixtures     → 10yr
 *   machinery_equipment    → 10yr (general; varies by industry)
 *   leasehold_improvements → 10yr (Tulsa County CLASS 50)
 *   vehicles               → 6yr  (unlicensed only — forklifts, construction equipment)
 *   inventory              → 1yr  (100% — average monthly cost)
 *   supplies               → 1yr  (100% — acquisition cost)
 *   leased_equipment       → 10yr (same life as owned equivalent)
 *   other                  → 9yr  (retail/service trade fixtures)
 */

import { DepreciationEntry } from './tx-depreciation';

const SOURCE_DOCUMENT = 'OTC Business Personal Property Valuation Schedule 2025';
const SOURCE_YEAR = 2025;

/**
 * Raw percent-good values from OTC 2025, page 117.
 * Key = economic life, Value = array of percent-good by year of life.
 * Index 0 = Year 1, last value in each array is the floor (20%).
 */
const OK_PERCENT_GOOD: Record<string, number[]> = {
  // 5-year life (computers, data processing, vending, hand tools, communications)
  '5yr': [85, 69, 52, 34, 23, 20],
  // 6-year life (calculators, copiers, fax, alarms, forklifts, cash registers)
  '6yr': [87, 73, 57, 41, 30, 23, 20],
  // 9-year life (retail fixtures, wholesale trade, service business F&F)
  '9yr': [91, 82, 72, 61, 51, 41, 33, 26, 22, 20],
  // 10-year life (office F&F, restaurant F&E, hotel/motel, medical, general equipment)
  '10yr': [92, 84, 76, 68, 58, 49, 39, 30, 24, 21, 20],
};

/**
 * Map our asset_category enum values to OTC Economic Life categories.
 */
const CATEGORY_TO_OTC_LIFE: Record<string, string> = {
  computer_equipment: '5yr',
  furniture_fixtures: '10yr',
  machinery_equipment: '10yr',
  leasehold_improvements: '10yr',
  vehicles: '6yr',
  leased_equipment: '10yr',
  other: '9yr',
  office_equipment: '10yr',
  medical_equipment: '10yr',
  restaurant_equipment: '10yr',
  telecommunications: '5yr',
  software: '5yr',
  tools_dies: '10yr',
  signs_displays: '9yr',
};

function buildEntries(): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];

  // Standard depreciating categories
  for (const [category, otcLife] of Object.entries(CATEGORY_TO_OTC_LIFE)) {
    const percentGoods = OK_PERCENT_GOOD[otcLife];
    if (!percentGoods) {
      throw new Error(`No percent-good data for OTC life ${otcLife}`);
    }

    for (let i = 0; i < percentGoods.length; i++) {
      entries.push({
        state: 'OK',
        category,
        yearOfLife: i + 1,
        depreciationPercent: percentGoods[i].toFixed(2),
        sourceDocument: SOURCE_DOCUMENT,
        sourceYear: SOURCE_YEAR,
      });
    }
  }

  // Inventory: always 100% of cost (average monthly inventory)
  entries.push({
    state: 'OK',
    category: 'inventory',
    yearOfLife: 1,
    depreciationPercent: '100.00',
    sourceDocument: SOURCE_DOCUMENT,
    sourceYear: SOURCE_YEAR,
  });

  // Supplies: always 100% of cost
  entries.push({
    state: 'OK',
    category: 'supplies',
    yearOfLife: 1,
    depreciationPercent: '100.00',
    sourceDocument: SOURCE_DOCUMENT,
    sourceYear: SOURCE_YEAR,
  });

  return entries;
}

export const okDepreciation = buildEntries();
