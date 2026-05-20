'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Link, EntityType } from '@/types/api';

export function useLinks(entityType: EntityType, entityId: string) {
  return useQuery<Link[]>({
    queryKey: ['links', entityType, entityId],
    queryFn: () =>
      api.get('/links', { params: { entity_type: entityType, entity_id: entityId } }).then(r => r.data),
    enabled: !!entityId,
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: EntityType; entityId: string; url: string; label?: string }) =>
      api.post('/links', data).then(r => r.data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['links', v.entityType, v.entityId] }),
  });
}

export function useUpdateLink(entityType: EntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { url?: string; label?: string } }) =>
      api.patch(`/links/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', entityType, entityId] }),
  });
}

export function useDeleteLink(entityType: EntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/links/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', entityType, entityId] }),
  });
}
