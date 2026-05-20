'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { OrgNode, PaginatedResponse, User, AuditLog } from '@/types/api';

export function useAdminUsers(params?: Record<string, string | number>) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-users', params],
    queryFn: () => api.get('/admin/users', { params }).then(r => r.data),
  });
}

export function useOrgChart() {
  return useQuery<OrgNode[]>({
    queryKey: ['org-chart'],
    queryFn: () => api.get('/admin/org-chart').then(r => r.data),
  });
}

export function useAuditLogs(params?: Record<string, string>) {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get('/admin/audit-logs', { params }).then(r => r.data),
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/admin/users', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['org-chart'] });
    },
  });
}

export function useUpdateAdminUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useChangeParent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentId: string | null) =>
      api.patch(`/admin/users/${id}/parent`, { parentId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['org-chart'] });
    },
  });
}

export function useDeactivateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}
