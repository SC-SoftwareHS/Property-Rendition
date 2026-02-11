'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import type {
  Location,
  LocationWithJurisdiction,
  LocationFormValues,
  CountyOption,
} from '@/lib/validations/location';

export function useLocations(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['locations', clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<LocationWithJurisdiction[]>(
        `/clients/${clientId}/locations`,
        { token },
      );
    },
    enabled: !!clientId,
  });
}

export function useLocation(clientId: string, locationId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['locations', clientId, locationId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<LocationWithJurisdiction>(
        `/clients/${clientId}/locations/${locationId}`,
        { token },
      );
    },
    enabled: !!clientId && !!locationId,
  });
}

export function useCreateLocation(clientId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: LocationFormValues) => {
      const token = await getToken();
      return apiClient<Location>(`/clients/${clientId}/locations`, {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', clientId] });
    },
  });
}

export function useUpdateLocation(clientId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LocationFormValues> }) => {
      const token = await getToken();
      return apiClient<Location>(`/clients/${clientId}/locations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', clientId] });
    },
  });
}

export function useDeleteLocation(clientId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiClient<Location>(`/clients/${clientId}/locations/${id}`, {
        method: 'DELETE',
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', clientId] });
    },
  });
}

export function useCountiesByState(state: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['jurisdictions', 'counties', state],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<CountyOption[]>(
        `/jurisdictions/counties?state=${state}`,
        { token },
      );
    },
    enabled: !!state,
  });
}
