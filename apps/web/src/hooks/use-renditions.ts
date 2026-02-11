'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import type { Rendition, FirmRendition } from '@/lib/validations/rendition';

export function useRenditions(clientId: string, locationId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['renditions', clientId, locationId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<Rendition[]>(
        `/clients/${clientId}/locations/${locationId}/renditions`,
        { token },
      );
    },
    enabled: !!clientId && !!locationId,
  });
}

export function useRendition(clientId: string, locationId: string, renditionId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['renditions', clientId, locationId, renditionId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<Rendition>(
        `/clients/${clientId}/locations/${locationId}/renditions/${renditionId}`,
        { token },
      );
    },
    enabled: !!clientId && !!locationId && !!renditionId,
  });
}

export function useFirmRenditions(filters?: { taxYear?: number; status?: string }) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['firm-renditions', filters],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters?.taxYear) params.set('taxYear', String(filters.taxYear));
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return apiClient<FirmRendition[]>(`/renditions${qs ? `?${qs}` : ''}`, { token });
    },
  });
}

export function useCreateRendition() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      locationId,
      taxYear,
    }: {
      clientId: string;
      locationId: string;
      taxYear: number;
    }) => {
      const token = await getToken();
      return apiClient<Rendition>(
        `/clients/${clientId}/locations/${locationId}/renditions`,
        { method: 'POST', body: JSON.stringify({ taxYear }), token },
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['renditions', vars.clientId, vars.locationId] });
      queryClient.invalidateQueries({ queryKey: ['firm-renditions'] });
    },
  });
}

export function useRecalculateRendition() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      locationId,
      renditionId,
    }: {
      clientId: string;
      locationId: string;
      renditionId: string;
    }) => {
      const token = await getToken();
      return apiClient<Rendition>(
        `/clients/${clientId}/locations/${locationId}/renditions/${renditionId}/recalculate`,
        { method: 'POST', token },
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['renditions', vars.clientId, vars.locationId, vars.renditionId],
      });
      queryClient.invalidateQueries({ queryKey: ['firm-renditions'] });
    },
  });
}

export function useUpdateRenditionStatus() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      locationId,
      renditionId,
      status,
    }: {
      clientId: string;
      locationId: string;
      renditionId: string;
      status: string;
    }) => {
      const token = await getToken();
      return apiClient<Rendition>(
        `/clients/${clientId}/locations/${locationId}/renditions/${renditionId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }), token },
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['renditions', vars.clientId, vars.locationId, vars.renditionId],
      });
      queryClient.invalidateQueries({ queryKey: ['renditions', vars.clientId, vars.locationId] });
      queryClient.invalidateQueries({ queryKey: ['firm-renditions'] });
    },
  });
}

export function useGeneratePdf() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      locationId,
      renditionId,
    }: {
      clientId: string;
      locationId: string;
      renditionId: string;
    }) => {
      const token = await getToken();
      return apiClient<{ message: string; filename: string; sizeBytes: number }>(
        `/clients/${clientId}/locations/${locationId}/renditions/${renditionId}/generate-pdf`,
        { method: 'POST', token },
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['renditions', vars.clientId, vars.locationId, vars.renditionId],
      });
      queryClient.invalidateQueries({ queryKey: ['firm-renditions'] });
    },
  });
}

export function useDownloadPdf() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      locationId,
      renditionId,
    }: {
      clientId: string;
      locationId: string;
      renditionId: string;
    }) => {
      const token = await getToken();
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3002';

      const res = await fetch(
        `${API_URL}/clients/${clientId}/locations/${locationId}/renditions/${renditionId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) throw new Error('Failed to download PDF');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const filename = disposition?.match(/filename="(.+?)"/)?.[1] ?? `rendition-${renditionId}.pdf`;

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
