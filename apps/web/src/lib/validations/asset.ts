import { z } from 'zod';

export const ASSET_CATEGORIES = [
  { value: 'furniture_fixtures', label: 'Furniture & Fixtures' },
  { value: 'machinery_equipment', label: 'Machinery & Equipment' },
  { value: 'computer_equipment', label: 'Computer Equipment' },
  { value: 'leasehold_improvements', label: 'Leasehold Improvements' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'leased_equipment', label: 'Leased Equipment' },
  { value: 'other', label: 'Other' },
] as const;

export const assetSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  category: z.enum([
    'furniture_fixtures',
    'machinery_equipment',
    'computer_equipment',
    'leasehold_improvements',
    'vehicles',
    'inventory',
    'supplies',
    'leased_equipment',
    'other',
  ]),
  originalCost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid dollar amount'),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'),
  disposalDate: z.string().optional().or(z.literal('')),
  quantity: z.number().int().min(1).optional(),
  isLeased: z.boolean().optional(),
  lessorName: z.string().max(255).optional().or(z.literal('')),
  lessorAddress: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type AssetFormValues = z.infer<typeof assetSchema>;

export interface Asset {
  id: string;
  locationId: string;
  description: string;
  category: string;
  originalCost: string;
  acquisitionDate: string;
  disposalDate: string | null;
  quantity: number;
  isLeased: boolean;
  lessorName: string | null;
  lessorAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AssetSummary {
  totalAssets: number;
  totalValue: string;
}
