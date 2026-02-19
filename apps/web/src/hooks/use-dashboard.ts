import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';

export interface DashboardStats {
  clientCount: number;
  locationCount: number;
  assetCount: number;
  renditionsByStatus: Record<string, number>;
  currentTaxYear: number;
  upcomingDeadlines: {
    county: string;
    state: string;
    deadline: string;
    daysLeft: number;
    locationCount: number;
  }[];
}

export function useDashboardStats(taxYear?: number) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', taxYear],
    queryFn: async () => {
      const token = await getToken();
      const qs = taxYear ? `?taxYear=${taxYear}` : '';
      return apiClient<DashboardStats>(`/dashboard/stats${qs}`, { token });
    },
  });
}
