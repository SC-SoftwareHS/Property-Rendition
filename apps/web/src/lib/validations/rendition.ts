export interface FmvOverrideEntry {
  overrideValue: number;
  reason: string;
  appliedBy: string;
  appliedAt: string;
}

export interface Rendition {
  id: string;
  locationId: string;
  jurisdictionId: string;
  taxYear: number;
  status: RenditionStatus;
  calculatedTotals: CalculationResult | null;
  filedBy: string | null;
  filedAt: string | null;
  pdfUrl: string | null;
  fmvOverrides: Record<string, FmvOverrideEntry> | null;
  // HB 9 ($125K BPP exemption) fields
  hb9Exempt: boolean;
  hb9HasRelatedEntities: boolean;
  hb9ElectNotToRender: boolean;
  hb9ExemptionAmount: string;
  hb9NetTaxableValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RenditionStatus =
  | 'not_started'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'filed';

export interface FirmRendition extends Rendition {
  locationName: string;
  clientId: string;
  companyName: string;
  county: string | null;
  state: string | null;
}

export interface CategoryYearGroup {
  acquisitionYear: number;
  originalCost: number;
  depreciatedValue: number;
  percentGood: number;
  yearOfLife: number;
  assetCount: number;
}

export interface CategorySummary {
  totalOriginalCost: number;
  totalDepreciatedValue: number;
  assetCount: number;
  byYear: Record<number, CategoryYearGroup>;
}

export interface AssetCalculation {
  assetId: string;
  description: string;
  category: string;
  originalCost: number;
  acquisitionYear: number;
  yearOfLife: number;
  percentGood: number;
  depreciatedValue: number;
  quantity: number;
  isLeased: boolean;
  isOverridden?: boolean;
  overrideValue?: number;
  originalDepreciatedValue?: number;
}

export interface Hb9Exemption {
  exemptionAmount: number;
  isExempt: boolean;
  hasRelatedEntities: boolean;
  electNotToRender: boolean;
  netTaxableValue: number;
}

export interface CalculationResult {
  taxYear: number;
  state: string;
  calculatedAt: string;
  byCategory: Record<string, CategorySummary>;
  grandTotalOriginalCost: number;
  grandTotalDepreciatedValue: number;
  totalAssetCount: number;
  assets: AssetCalculation[];
  hb9?: Hb9Exemption;
}

export const STATUS_LABELS: Record<RenditionStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  review: 'In Review',
  approved: 'Approved',
  filed: 'Filed',
};

export const STATUS_COLORS: Record<RenditionStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  filed: 'bg-purple-100 text-purple-800',
};

export interface BatchGenerateResult {
  total: number;
  success: number;
  failed: number;
  results: {
    renditionId: string;
    companyName: string;
    locationName: string;
    filename?: string;
    error?: string;
  }[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  furniture_fixtures: 'Furniture & Fixtures',
  office_equipment: 'Office Equipment',
  machinery_equipment: 'Machinery & Equipment',
  medical_equipment: 'Medical / Professional Equipment',
  restaurant_equipment: 'Restaurant / Store Equipment',
  computer_equipment: 'Computer Equipment',
  telecommunications: 'Telecommunications',
  software: 'Software',
  leasehold_improvements: 'Leasehold Improvements',
  vehicles: 'Vehicles',
  tools_dies: 'Tools, Dies & Molds',
  signs_displays: 'Signs & Displays',
  inventory: 'Inventory',
  supplies: 'Supplies',
  leased_equipment: 'Leased Equipment',
  other: 'Other',
};
