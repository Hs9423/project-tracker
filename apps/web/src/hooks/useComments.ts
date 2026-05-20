'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Comment, EntityType } from '@/types/api';

export function useComments(entityType: EntityType, entityId: string) {
  return useQuery<Comment[]>({
    queryKey: ['comments', entityType, entityId],
    queryFn: () =>
      api.get('/comments', { params: { entity_type: entityType, entity_id: entityId } }).then(r => r.data),
    enabled: !!entityId,
  });
}

export function useCreateComment(entityType: EntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: Record<string, unknown>; parentId?: string }) =>
      api.post('/comments', { ...data, entityType, entityId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', entityType, entityId] }),
  });
}

export function useUpdateComment(entityType: EntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/comments/${id}`, { body }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', entityType, entityId] }),
  });
}

export function useDeleteComment(entityType: EntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/comments/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', entityType, entityId] }),
  });
}
