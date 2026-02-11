'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import type { Client, ClientsResponse, ClientFormValues } from '@/lib/validations/client';

interface UseClientsParams {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useClients(params: UseClientsParams = {}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const token = await getToken();
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.offset) searchParams.set('offset', String(params.offset));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      const qs = searchParams.toString();
      return apiClient<ClientsResponse>(`/clients${qs ? `?${qs}` : ''}`, { token });
    },
  });
}

export function useClient(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<Client>(`/clients/${clientId}`, { token });
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const token = await getToken();
      return apiClient<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientFormValues> }) => {
      const token = await getToken();
      return apiClient<Client>(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiClient<Client>(`/clients/${id}`, {
        method: 'DELETE',
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
