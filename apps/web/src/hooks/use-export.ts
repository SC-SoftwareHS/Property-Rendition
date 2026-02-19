'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

type ExportFormat = 'csv' | 'xlsx' | 'json';

function useExportDownload() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      endpoint,
      format,
      params,
    }: {
      endpoint: string;
      format: ExportFormat;
      params?: Record<string, string>;
    }) => {
      const token = await getToken();
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3002';

      const searchParams = new URLSearchParams({ format, ...params });
      const res = await fetch(`${API_URL}/export/${endpoint}?${searchParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const filename =
        disposition?.match(/filename="(.+?)"/)?.[1] ?? `export.${format}`;

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

export function useExportClients() {
  const download = useExportDownload();

  return {
    ...download,
    exportClients: (format: ExportFormat) =>
      download.mutate({ endpoint: 'clients', format }),
  };
}

export function useExportAssets() {
  const download = useExportDownload();

  return {
    ...download,
    exportAssets: (format: ExportFormat, params?: { clientId?: string; locationId?: string }) =>
      download.mutate({
        endpoint: 'assets',
        format,
        params: {
          ...(params?.clientId && { clientId: params.clientId }),
          ...(params?.locationId && { locationId: params.locationId }),
        },
      }),
  };
}

export function useExportRenditions() {
  const download = useExportDownload();

  return {
    ...download,
    exportRenditions: (format: ExportFormat, params?: { taxYear?: number; status?: string }) =>
      download.mutate({
        endpoint: 'renditions',
        format,
        params: {
          ...(params?.taxYear && { taxYear: String(params.taxYear) }),
          ...(params?.status && { status: params.status }),
        },
      }),
  };
}
