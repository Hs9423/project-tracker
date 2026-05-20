import { ProjectStatus } from '../enums/project-status.enum';
import { Priority } from '../enums/priority.enum';
import { VisibilityReason } from '../enums/visibility-reason.enum';

export interface Project {
  id: string;
  title: string;
  description: string | null;
  createdBy: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: Date | null;
  dueDate: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: Date;
}

export interface ProjectVisibility {
  id: string;
  projectId: string;
  userId: string;
  reason: VisibilityReason;
  createdAt: Date;
}
