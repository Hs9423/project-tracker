'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { UserPublic, Project } from '@/types/api';

export function useMyTeam() {
  return useQuery<UserPublic[]>({
    queryKey: ['my-team'],
    queryFn: () => api.get('/users/me/team').then(r => r.data),
  });
}

export function useUserProjects(userId: string) {
  return useQuery<Project[]>({
    queryKey: ['user-projects', userId],
    queryFn: () => api.get(`/users/${userId}/projects`).then(r => r.data),
    enabled: !!userId,
  });
}
