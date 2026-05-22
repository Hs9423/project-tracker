'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Task } from '@/types/api';

export function useTasks(projectId: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then(r => r.data),
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then(r => r.data),
    enabled: !!taskId,
  });
}

export function useMyTasks() {
  return useQuery<Task[]>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks/mine').then(r => r.data),
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/projects/${projectId}/tasks`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useCreateSubtask(parentId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/tasks/${parentId}/subtasks`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateTask(projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/tasks/${id}`, data).then(r => r.data),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['task', id] });
      if (projectId) {
        qc.invalidateQueries({ queryKey: ['tasks', projectId] });
        qc.invalidateQueries({ queryKey: ['kanban', projectId] });
        qc.invalidateQueries({ queryKey: ['project', projectId] });
      }
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useCreateDependency(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { dependsOnTaskId: string; type?: string }) =>
      api.post(`/tasks/${taskId}/dependencies`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  });
}

export function useDeleteDependency(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) => api.delete(`/tasks/${taskId}/dependencies/${depId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  });
}

export function useTaskActivity(taskId: string) {
  return useQuery<Array<{ type: 'comment' | 'audit'; createdAt: string; data: Record<string, unknown> }>>({
    queryKey: ['task-activity', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/activity`).then(r => r.data),
    enabled: !!taskId,
  });
}

export function useAllVisibleTasks() {
  return useQuery<import('@/types/api').Task[]>({
    queryKey: ['tasks', 'all-visible'],
    queryFn: () => api.get('/tasks/visible').then(r => r.data),
  });
}
