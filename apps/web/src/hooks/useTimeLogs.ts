'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { TimeLog } from '@/types/api';

export function useTimeLogs(taskId: string) {
  return useQuery<TimeLog[]>({
    queryKey: ['time-logs', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/time-logs`).then(r => r.data),
    enabled: !!taskId,
  });
}

export function useTimesheet(week: string) {
  return useQuery({
    queryKey: ['timesheet', week],
    queryFn: () => api.get('/users/me/timesheet', { params: { week } }).then(r => r.data),
    enabled: !!week,
  });
}

export function useCreateTimeLog(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; hours: number; note?: string }) =>
      api.post(`/tasks/${taskId}/time-logs`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-logs', taskId] });
      if (projectId) qc.invalidateQueries({ queryKey: ['time-report', projectId] });
    },
  });
}

export function useUpdateTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ date: string; hours: number; note: string }> }) =>
      api.patch(`/time-logs/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-logs'] }),
  });
}

export function useDeleteTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/time-logs/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-logs'] }),
  });
}
