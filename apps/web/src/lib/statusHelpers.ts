import type { TaskStatus, ProjectStatus, Priority } from '@/types/api';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', blocked: 'Blocked', done: 'Done',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
};

export function statusVariant(status: TaskStatus) {
  return { todo: 'muted', in_progress: 'default', in_review: 'warning', blocked: 'danger', done: 'success' }[status] as 'muted' | 'default' | 'warning' | 'danger' | 'success';
}

export function projectStatusVariant(status: ProjectStatus) {
  return { planning: 'muted', active: 'success', on_hold: 'warning', completed: 'default', cancelled: 'danger' }[status] as 'muted' | 'success' | 'warning' | 'default' | 'danger';
}

export function priorityColor(p: Priority) {
  return { critical: 'text-red', high: 'text-amber', medium: 'text-accent', low: 'text-text2' }[p];
}

export function priorityDot(p: Priority) {
  return { critical: 'bg-red', high: 'bg-amber', medium: 'bg-accent', low: 'bg-text2' }[p];
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'blocked', 'done'];

export function dueDateColor(dueDate: string | null | undefined): string {
  if (!dueDate) return 'text-text2';
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'text-red';
  if (diffDays <= 3) return 'text-amber';
  return 'text-text2';
}
