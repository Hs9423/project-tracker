'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { UserPublic } from '@/types/api';

export function useMyTeam() {
  return useQuery<UserPublic[]>({
    queryKey: ['my-team'],
    queryFn: () => api.get('/users/me/team').then(r => r.data),
  });
}
