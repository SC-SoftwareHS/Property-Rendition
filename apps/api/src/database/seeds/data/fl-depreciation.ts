/**
 * FL DOR Tangible Personal Property Depreciation Schedule
 *
 * Source: Florida Department of Revenue — Untrended Depreciation Schedule (Attachment C)
 * URL: https://floridarevenue.com/property/Documents/paguidec.pdf
 *
 * Florida uses RCNLD (Replacement Cost New Less Depreciation):
 *   Market Value = Historical Cost × Index Factor × Percent Good
 *
 * For our system, we store percent-good applied directly to original cost
 * (no index/trending factor). This matches what taxpayers report on the DR-405
 * as "Taxpayer's Estimate of Fair Market Value."
 *
 * Key FL differences from TX/OK:
 * - Floor value: ~18-20% depending on economic life (most ≈ 20%)
 * - Inventory is EXEMPT in FL (§192.001(11)(d), F.S.)
 * - Licensed vehicles are generally NOT reported on DR-405
 * - Filing deadline: April 1 (vs TX April 15)
 * - $25,000 automatic TPP exemption per return
 *
 * Category → FL Economic Life mapping:
 *   computer_equipment     → 5yr  (DR-405 Line 11: EDP equipment, computers)
 *   furniture_fixtures     → 10yr (DR-405 Lines 10, 12, 16, 19)
 *   machinery_equipment    → 10yr (DR-405 Lines 13-15, 18, 21, 24)
 *   leasehold_improvements → 15yr (DR-405 Lines 17, 20)
 *   vehicles               → 6yr  (unlicensed equipment only)
 *   inventory              → EXEMPT (not on DR-405)
 *   supplies               → 1yr  (DR-405 Line 23: 100%)
 *   leased_equipment       → 10yr
 *   other                  → 10yr (DR-405 Line 25)
 */

import { DepreciationEntry } from './tx-depreciation';

const SOURCE_DOCUMENT = 'FL DOR Untrended Depreciation Schedule (Attachment C)';
const SOURCE_YEAR = 2025;

/**
 * Percent-good values from FL DOR Untrended Depreciation Schedule.
 * Values are percentages (85 = 85%).
 * Index 0 = Age 1 (first year), last value = floor.
 */
const FL_PERCENT_GOOD: Record<string, number[]> = {
  // 5-year life (computers, EDP, word processors)
  '5yr': [85, 69, 52, 34, 23, 18],
  // 6-year life (copiers, fax, calculators, forklifts)
  '6yr': [87, 73, 57, 41, 30, 23, 19],
  // 10-year life (office F&F, restaurant, hotel/motel, medical, general equipment)
  '10yr': [92, 84, 76, 68, 58, 49, 39, 30, 24, 21, 20],
  // 15-year life (leasehold improvements, clay/stone products)
  '15yr': [95, 90, 85, 79, 73, 68, 62, 55, 49, 43, 37, 31, 26, 23, 21, 20],
};

/**
 * Map our asset_category enum values to FL Economic Life categories.
 */
const CATEGORY_TO_FL_LIFE: Record<string, string> = {
  computer_equipment: '5yr',
  furniture_fixtures: '10yr',
  machinery_equipment: '10yr',
  leasehold_improvements: '15yr',
  vehicles: '6yr',
  leased_equipment: '10yr',
  other: '10yr',
  office_equipment: '10yr',
  medical_equipment: '10yr',
  restaurant_equipment: '10yr',
  telecommunications: '5yr',
  software: '5yr',
  tools_dies: '10yr',
  signs_displays: '10yr',
};

function buildEntries(): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];

  // Standard depreciating categories
  for (const [category, flLife] of Object.entries(CATEGORY_TO_FL_LIFE)) {
    const percentGoods = FL_PERCENT_GOOD[flLife];
    if (!percentGoods) {
      throw new Error(`No percent-good data for FL life ${flLife}`);
    }

    for (let i = 0; i < percentGoods.length; i++) {
      entries.push({
        state: 'FL',
        category,
        yearOfLife: i + 1,
        depreciationPercent: percentGoods[i].toFixed(2),
        sourceDocument: SOURCE_DOCUMENT,
        sourceYear: SOURCE_YEAR,
      });
    }
  }

  // Inventory: EXEMPT in FL — but we still store 100% for safety
  // (the FL strategy will skip inventory on the form)
  entries.push({
    state: 'FL',
    category: 'inventory',
    yearOfLife: 1,
    depreciationPercent: '100.00',
    sourceDocument: SOURCE_DOCUMENT,
    sourceYear: SOURCE_YEAR,
  });

  // Supplies: 100% of cost (DR-405 Line 23)
  entries.push({
    state: 'FL',
    category: 'supplies',
    yearOfLife: 1,
    depreciationPercent: '100.00',
    sourceDocument: SOURCE_DOCUMENT,
    sourceYear: SOURCE_YEAR,
  });

  return entries;
}

export const flDepreciation = buildEntries();
