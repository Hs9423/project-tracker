'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ProjectReport,
  TeamProductivityRow,
  TimeTrackingReport,
  WorkloadRow,
  ExportFormat,
  ExportStatus,
  ReportType,
} from '@/types/api';

export function useProjectReport(projectId: string) {
  return useQuery<ProjectReport>({
    queryKey: ['report', 'project', projectId],
    queryFn: () => api.get(`/reports/project/${projectId}`).then(r => r.data),
    enabled: !!projectId,
  });
}

export function useTeamProductivity(from?: string, to?: string) {
  return useQuery<TeamProductivityRow[]>({
    queryKey: ['report', 'team-productivity', from, to],
    queryFn: () =>
      api.get('/reports/team-productivity', { params: { from, to } }).then(r => r.data),
  });
}

export function useTimeTracking(params: { projectId?: string; userId?: string; from?: string; to?: string }) {
  return useQuery<TimeTrackingReport>({
    queryKey: ['report', 'time-tracking', params],
    queryFn: () => api.get('/reports/time-tracking', { params }).then(r => r.data),
  });
}

export function useWorkload(from?: string, to?: string) {
  return useQuery<WorkloadRow[]>({
    queryKey: ['report', 'workload', from, to],
    queryFn: () => api.get('/reports/workload', { params: { from, to } }).then(r => r.data),
  });
}

export function useQueueExport() {
  return useMutation({
    mutationFn: (data: { type: ReportType; format: ExportFormat; filters?: Record<string, string> }) =>
      api.post('/reports/export', data).then(r => r.data as { jobId: string }),
  });
}

export function useExportStatus(jobId: string | null) {
  return useQuery<ExportStatus>({
    queryKey: ['report', 'export', jobId],
    queryFn: () => api.get(`/reports/export/${jobId}`).then(r => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 2000;
      return d.status === 'pending' ? 2000 : false;
    },
  });
}
