'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import type { Asset, AssetFormValues, AssetSummary } from '@/lib/validations/asset';

function assetBasePath(clientId: string, locationId: string) {
  return `/clients/${clientId}/locations/${locationId}/assets`;
}

export function useAssets(clientId: string, locationId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['assets', clientId, locationId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<Asset[]>(assetBasePath(clientId, locationId), { token });
    },
    enabled: !!clientId && !!locationId,
  });
}

export function useAssetSummary(clientId: string, locationId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['assets', 'summary', clientId, locationId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<AssetSummary>(
        `${assetBasePath(clientId, locationId)}/summary`,
        { token },
      );
    },
    enabled: !!clientId && !!locationId,
  });
}

export function useCreateAsset(clientId: string, locationId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: AssetFormValues) => {
      const token = await getToken();
      return apiClient<Asset>(assetBasePath(clientId, locationId), {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', clientId, locationId] });
    },
  });
}

export function useUpdateAsset(clientId: string, locationId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssetFormValues> }) => {
      const token = await getToken();
      return apiClient<Asset>(`${assetBasePath(clientId, locationId)}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', clientId, locationId] });
    },
  });
}

export function useDeleteAsset(clientId: string, locationId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiClient<Asset>(`${assetBasePath(clientId, locationId)}/${id}`, {
        method: 'DELETE',
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', clientId, locationId] });
    },
  });
}
