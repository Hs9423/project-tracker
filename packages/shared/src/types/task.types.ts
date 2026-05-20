import { TaskStatus } from '../enums/task-status.enum';
import { Priority } from '../enums/priority.enum';
import { DependencyType } from '../enums/dependency-type.enum';
import { EntityType } from '../enums/entity-type.enum';

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
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number | null;
  position: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOn: string;
  type: DependencyType;
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  date: Date;
  hours: number;
  note: string | null;
  createdAt: Date;
}

export interface Comment {
  id: string;
  entityType: EntityType;
  entityId: string;
  authorId: string;
  body: Record<string, unknown>;
  parentId: string | null;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Link {
  id: string;
  entityType: EntityType;
  entityId: string;
  label: string | null;
  url: string;
  addedBy: string;
  createdAt: Date;
}
