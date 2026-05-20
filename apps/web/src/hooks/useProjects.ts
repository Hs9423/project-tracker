'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Project, KanbanBoard, GanttTask, WorkloadEntry, ProjectVisibilityRow } from '@/types/api';

export function useProjects(params?: Record<string, string>) {
  return useQuery<Project[]>({
    queryKey: ['projects', params],
    queryFn: () => api.get('/projects', { params }).then(r => r.data),
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useProjectTeam(id: string) {
  return useQuery<ProjectVisibilityRow[]>({
    queryKey: ['project-team', id],
    queryFn: () => api.get(`/projects/${id}/team`).then(r => r.data),
    enabled: !!id,
  });
}

export function useKanban(id: string) {
  return useQuery<KanbanBoard>({
    queryKey: ['kanban', id],
    queryFn: () => api.get(`/projects/${id}/kanban`).then(r => r.data),
    enabled: !!id,
  });
}

export function useGantt(id: string) {
  return useQuery<GanttTask[]>({
    queryKey: ['gantt', id],
    queryFn: () => api.get(`/projects/${id}/gantt`).then(r => r.data),
    enabled: !!id,
  });
}

export function useWorkload(id: string) {
  return useQuery<WorkloadEntry[]>({
    queryKey: ['workload', id],
    queryFn: () => api.get(`/projects/${id}/workload`).then(r => r.data),
    enabled: !!id,
  });
}

export function useTimeReport(id: string) {
  return useQuery({
    queryKey: ['time-report', id],
    queryFn: () => api.get(`/projects/${id}/time-report`).then(r => r.data),
    enabled: !!id,
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => api.get(`/projects/${id}/activity`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/projects/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
