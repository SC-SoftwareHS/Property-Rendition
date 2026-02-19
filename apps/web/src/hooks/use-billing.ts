'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';

export interface BillingInfo {
  subscriptionTier: string;
  billingStatus: string;
  stripeCustomerId: string | null;
}

export function useBilling() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<BillingInfo>('/billing', { token });
    },
  });
}

export function useCreateCheckout() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: { tier: string; interval: string }) => {
      const token = await getToken();
      return apiClient<{ url: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useCreatePortal() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient<{ url: string }>('/billing/portal', {
        method: 'POST',
        token,
      });
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}
