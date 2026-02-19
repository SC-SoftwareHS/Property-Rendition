'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';

export interface FirmUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  clerkUserId: string;
  createdAt: string;
}

export interface FirmInvite {
  id: string;
  firmId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export function useUsers() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<FirmUser[]>('/users', { token });
    },
  });
}

export function useInvites() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<FirmInvite[]>('/users/invites', { token });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: { email: string; role?: string }) => {
      const token = await getToken();
      return apiClient<FirmInvite>('/users/invite', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const token = await getToken();
      return apiClient(`/users/invites/${inviteId}`, {
        method: 'DELETE',
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const token = await getToken();
      return apiClient(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken();
      return apiClient(`/users/${userId}`, {
        method: 'DELETE',
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
