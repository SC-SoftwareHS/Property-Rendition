import { z } from 'zod';

export const clientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255),
  ein: z.string().max(20).optional().or(z.literal('')),
  contactName: z.string().max(255).optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  industry: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export interface Client {
  id: string;
  firmId: string;
  companyName: string;
  ein: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  industry: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ClientsResponse {
  data: Client[];
  total: number;
  limit: number;
  offset: number;
}
