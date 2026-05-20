export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
export type VisibilityReason = 'assignee' | 'ancestor' | 'co_assignee';
export type EntityType = 'task' | 'project';
export type Role = 'super_admin' | 'user';
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish';

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface User extends UserPublic {
  role: Role;
  reportsTo: string | null;
  path: string;
  depth: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager?: UserPublic;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  assignee: UserPublic;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  createdBy: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  assignments?: ProjectAssignment[];
  creator?: UserPublic;
  tasksByStatus?: Record<TaskStatus, number>;
  totalHoursLogged?: number;
  linksCount?: number;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  createdBy: string;
  status: TaskStatus;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  position: number;
  path: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: UserPublic;
  creator?: UserPublic;
  children?: Task[];
  subtasks?: Task[];
  timeLogged?: number;
  linksCount?: number;
  commentsCount?: number;
  subtaskCount?: number;
  _count?: { subtasks: number; dependsOn: number };
  dependsOn?: TaskDependencyRow[];
  dependedOnBy?: TaskDependencyRow[];
  timeLogs?: TimeLog[];
  links?: Link[];
}

export interface TaskDependencyRow {
  id: string;
  taskId: string;
  dependsOn: string;
  type: DependencyType;
  dependency?: { id: string; title: string; status: TaskStatus };
  task?: { id: string; title: string; status: TaskStatus };
}

export interface GanttTask {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  baselineStartDate: string | null;
  baselineDueDate: string | null;
  estimatedHours: number | null;
  status: TaskStatus;
  priority: Priority;
  assignee: UserPublic | null;
  parentTaskId: string | null;
  dependencies: { taskId: string; type: DependencyType }[];
}

export interface KanbanBoard {
  todo: Task[];
  in_progress: Task[];
  in_review: Task[];
  blocked: Task[];
  done: Task[];
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  hours: number;
  note: string | null;
  createdAt: string;
  user?: UserPublic;
  task?: { id: string; title: string; projectId: string };
}

export interface Link {
  id: string;
  entityType: EntityType;
  entityId: string;
  url: string;
  label: string | null;
  addedBy: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  entityType: EntityType;
  entityId: string;
  body: Record<string, unknown>;
  authorId: string;
  parentId: string | null;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author?: UserPublic;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  entityType: EntityType | null;
  entityId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ProjectVisibilityRow {
  id: string;
  projectId: string;
  userId: string;
  reason: VisibilityReason;
  createdAt: string;
  user: UserPublic & { depth: number; path: string };
}

export interface WorkloadEntry {
  user: UserPublic;
  reason: VisibilityReason;
  taskCount: number;
  estimatedHours: number;
  loggedHours: number;
  overdueCount: number;
  tasksByStatus: Partial<Record<TaskStatus, number>>;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrgNode {
  id: string;
  name: string;
  role: Role;
  depth: number;
  reportsTo: string | null;
  children: OrgNode[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface ProjectReport {
  progressPercent: number;
  tasksByStatus: Record<string, number>;
  overdueCount: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  memberBreakdown: {
    id: string;
    name: string;
    avatarUrl: string | null;
    tasksAssigned: number;
    tasksDone: number;
    hoursLogged: number;
  }[];
}

export interface TeamProductivityRow {
  user: UserPublic;
  tasksCompleted: number;
  hoursLogged: number;
  overdueCount: number;
  avgCompletionTimeDays: number;
}

export interface TimeTrackingReport {
  grouped: {
    user: UserPublic;
    totalHours: number;
    projects: {
      project: { id: string; title: string };
      totalHours: number;
      logs: {
        id: string;
        date: string;
        hours: number;
        note: string | null;
        task: { id: string; title: string };
      }[];
    }[];
  }[];
  summary: { totalHours: number; avgHoursPerDay: number; totalEntries: number };
}

export interface WorkloadRow {
  user: UserPublic;
  taskCount: number;
  estimatedHours: number;
  loggedHours: number;
  overdueCount: number;
  loadPercent: number;
  tasksByStatus?: Partial<Record<TaskStatus, number>>;
}

export type ReportType = 'project' | 'team-productivity' | 'time-tracking' | 'workload';
export type ExportFormat = 'pdf' | 'csv';

export interface ExportStatus {
  status: 'pending' | 'ready' | 'failed';
  downloadUrl?: string;
}
