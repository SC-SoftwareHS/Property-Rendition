import { z } from 'zod';

export const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(255),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(255).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zip: z.string().max(20).optional().or(z.literal('')),
  county: z.string().max(255).optional().or(z.literal('')),
  accountNumber: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

export interface Location {
  id: string;
  clientId: string;
  jurisdictionId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  accountNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocationWithJurisdiction {
  location: Location;
  jurisdiction: {
    id: string;
    appraisalDistrictName: string;
    filingDeadline: string | null;
    extensionDeadline: string | null;
  } | null;
}

export interface Jurisdiction {
  id: string;
  state: string;
  county: string;
  appraisalDistrictName: string;
  filingDeadline: string | null;
  extensionDeadline: string | null;
}

export interface CountyOption {
  county: string;
  appraisalDistrictName: string;
}
