'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';

export interface Firm {
  id: string;
  name: string;
  subscriptionTier: string;
  billingStatus: string;
  stripeCustomerId: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  defaultState: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFirmValues {
  name?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  defaultState?: string;
  timezone?: string;
}

export function useFirm() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['firm'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<Firm>('/firms/me', { token });
    },
  });
}

export function useUpdateFirm() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateFirmValues) => {
      const token = await getToken();
      return apiClient<Firm>('/firms/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firm'] });
    },
  });
}
