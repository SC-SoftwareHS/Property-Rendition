'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import type { CalculationResult } from '@/lib/validations/rendition';

export function useDepreciationPreview(
  clientId: string,
  locationId: string,
  taxYear: number,
  enabled = true,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['depreciation-preview', clientId, locationId, taxYear],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<CalculationResult>(
        `/clients/${clientId}/locations/${locationId}/depreciation/preview?taxYear=${taxYear}`,
        { token },
      );
    },
    enabled: !!clientId && !!locationId && !!taxYear && enabled,
  });
}
