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

export function useDashboardStats() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<DashboardStats>('/dashboard/stats', { token });
    },
  });
}
