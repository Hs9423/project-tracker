import { ProjectStatus } from '../enums/project-status.enum';
import { TaskStatus } from '../enums/task-status.enum';

export interface ProjectStatusReport {
  projectId: string;
  title: string;
  status: ProjectStatus;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueCount: number;
  totalLoggedHours: number;
}

export interface TeamProductivityReport {
  userId: string;
  userName: string;
  tasksCompleted: number;
  hoursLogged: number;
  dateRange: { from: Date; to: Date };
}

export interface WorkloadReport {
  userId: string;
  userName: string;
  taskCount: number;
  estimatedHours: number;
  loggedHours: number;
  overdueCount: number;
}

export interface TimeTrackingReport {
  entries: Array<{
    userId: string;
    projectId: string;
    taskId: string;
    date: Date;
    hours: number;
    note: string | null;
  }>;
  totalHours: number;
}

export type ExportFormat = 'pdf' | 'csv' | 'excel';

export type ReportType =
  | 'project_status'
  | 'team_productivity'
  | 'workload'
  | 'time_tracking';
