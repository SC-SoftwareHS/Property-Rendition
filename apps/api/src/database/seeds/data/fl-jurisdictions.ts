export const flJurisdictions = [
  'Alachua', 'Baker', 'Bay', 'Bradford', 'Brevard', 'Broward', 'Calhoun',
  'Charlotte', 'Citrus', 'Clay', 'Collier', 'Columbia', 'DeSoto', 'Dixie',
  'Duval', 'Escambia', 'Flagler', 'Franklin', 'Gadsden', 'Gilchrist', 'Glades',
  'Gulf', 'Hamilton', 'Hardee', 'Hendry', 'Hernando', 'Highlands', 'Hillsborough',
  'Holmes', 'Indian River', 'Jackson', 'Jefferson', 'Lafayette', 'Lake', 'Lee',
  'Leon', 'Levy', 'Liberty', 'Madison', 'Manatee', 'Marion', 'Martin',
  'Miami-Dade', 'Monroe', 'Nassau', 'Okaloosa', 'Okeechobee', 'Orange', 'Osceola',
  'Palm Beach', 'Pasco', 'Pinellas', 'Polk', 'Putnam', 'Santa Rosa', 'Sarasota',
  'Seminole', 'St. Johns', 'St. Lucie', 'Sumter', 'Suwannee', 'Taylor', 'Union',
  'Volusia', 'Wakulla', 'Walton', 'Washington',
].map((county) => ({
  state: 'FL' as const,
  county,
  appraisalDistrictName: `${county} County Property Appraiser`,
  filingDeadline: '2025-04-01',
  extensionDeadline: null as string | null,
}));
