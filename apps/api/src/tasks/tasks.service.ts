import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DependencyType, NotificationType, Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../projects/visibility.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';

const ASSIGNEE_SELECT = { id: true, name: true, avatarUrl: true };

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private visibility: VisibilityService,
    @Optional() private notifications: NotificationsService,
  ) {}

  // ─── Create root-level task ───────────────────────────────────────────────

  async createTask(projectId: string, dto: CreateTaskDto, creatorId: string) {
    const maxPos = await this.prisma.task.aggregate({
      where: { projectId, parentTaskId: null, deletedAt: null },
      _max: { position: true },
    });
    const position = dto.position ?? (maxPos._max.position ?? -1) + 1;

    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId ?? null,
        createdBy: creatorId,
        status: dto.status ?? TaskStatus.todo,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours ?? null,
        position,
        path: '',
      },
    });

    await this.prisma.task.update({
      where: { id: task.id },
      data: { path: task.id },
    });

    if (dto.assigneeId && dto.assigneeId !== creatorId && this.notifications) {
      await this.notifications.createAndEmit(
        dto.assigneeId,
        NotificationType.task_assigned,
        'task',
        task.id,
        `You have been assigned the task "${dto.title}"`,
      );
    }

    return this.getTaskById(task.id, creatorId);
  }

  // ─── My tasks ────────────────────────────────────────────────────────────

  async getMyTasks(userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { assigneeId: userId, deletedAt: null },
      include: {
        assignee: { select: ASSIGNEE_SELECT },
        _count: { select: { subtasks: true, dependsOn: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const taskIds = tasks.map((t) => t.id);
    const timeStats = await this.prisma.timeLog.groupBy({
      by: ['taskId'],
      where: { taskId: { in: taskIds } },
      _sum: { hours: true },
    });
    const hoursMap = new Map(timeStats.map((s) => [s.taskId, Number(s._sum.hours ?? 0)]));

    return tasks.map((t) => ({ ...t, timeLogged: hoursMap.get(t.id) ?? 0 }));
  }

  // ─── List tasks (tree) ────────────────────────────────────────────────────

  async listTasks(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignee: { select: ASSIGNEE_SELECT },
        _count: { select: { subtasks: true, dependsOn: true } },
      },
      orderBy: { position: 'asc' },
    });

    const taskIds = tasks.map((t) => t.id);

    const [timeStats, linkCounts] = await Promise.all([
      this.prisma.timeLog.groupBy({
        by: ['taskId'],
        where: { taskId: { in: taskIds } },
        _sum: { hours: true },
      }),
      this.prisma.link.groupBy({
        by: ['entityId'],
        where: { entityType: 'task', entityId: { in: taskIds } },
        _count: { id: true },
      }),
    ]);

    const hoursMap = new Map(timeStats.map((s) => [s.taskId, Number(s._sum.hours ?? 0)]));
    const linksMap = new Map(linkCounts.map((s) => [s.entityId, s._count.id]));

    const enriched = tasks.map((t) => ({
      ...t,
      timeLogged: hoursMap.get(t.id) ?? 0,
      linksCount: linksMap.get(t.id) ?? 0,
    }));

    return this.buildTree(enriched);
  }

  // ─── Get single task ──────────────────────────────────────────────────────

  async getTaskById(taskId: string, userId: string) {
    await this.checkAccess(taskId, userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: ASSIGNEE_SELECT },
        creator: { select: ASSIGNEE_SELECT },
        subtasks: {
          where: { deletedAt: null },
          include: { assignee: { select: ASSIGNEE_SELECT } },
          orderBy: { position: 'asc' },
        },
        timeLogs: {
          include: { user: { select: ASSIGNEE_SELECT } },
          orderBy: { date: 'desc' },
        },
        dependsOn: {
          include: {
            dependency: { select: { id: true, title: true, status: true } },
          },
        },
        dependedOnBy: {
          include: {
            task: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!task || task.deletedAt) throw new NotFoundException(`Task ${taskId} not found`);

    const [links, commentsCount] = await Promise.all([
      this.prisma.link.findMany({
        where: { entityType: 'task', entityId: taskId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where: { entityType: 'task', entityId: taskId } }),
    ]);

    return { ...task, links, commentsCount };
  }

  // ─── Update task ──────────────────────────────────────────────────────────

  async updateTask(taskId: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.checkAccess(taskId, userId);

    if (dto.status && dto.status !== task.status) {
      await this.prisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'task.statusChange',
          entityType: 'task',
          entityId: taskId,
          metadata: {
            projectId: task.projectId,
            oldStatus: task.status,
            newStatus: dto.status,
          },
        },
      });

      if (task.createdBy !== userId && this.notifications) {
        await this.notifications.createAndEmit(
          task.createdBy,
          NotificationType.task_status_changed,
          'task',
          taskId,
          `Task "${task.title}" status changed to ${dto.status.replace('_', ' ')}`,
        );
      }
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
      if (dto.assigneeId && dto.assigneeId !== userId && this.notifications) {
        await this.notifications.createAndEmit(
          dto.assigneeId,
          NotificationType.task_assigned,
          'task',
          taskId,
          `You have been assigned the task "${task.title}"`,
        );
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });

    return updated;
  }

  // ─── Soft delete task ─────────────────────────────────────────────────────

  async deleteTask(taskId: string, userId: string) {
    await this.checkAccess(taskId, userId);
    const now = new Date();

    // Soft-delete this task and all descendants
    const descendants = await this.prisma.task.findMany({
      where: { path: { startsWith: `${taskId}.` }, deletedAt: null },
      select: { id: true },
    });
    const idsToDelete = [taskId, ...descendants.map((d) => d.id)];

    await this.prisma.task.updateMany({
      where: { id: { in: idsToDelete } },
      data: { deletedAt: now },
    });

    return { deleted: idsToDelete.length };
  }

  // ─── Create subtask ───────────────────────────────────────────────────────

  async createSubtask(parentTaskId: string, dto: CreateTaskDto, creatorId: string) {
    const parent = await this.checkAccess(parentTaskId, creatorId);

    const maxPos = await this.prisma.task.aggregate({
      where: { parentTaskId, deletedAt: null },
      _max: { position: true },
    });
    const position = dto.position ?? (maxPos._max.position ?? -1) + 1;

    const task = await this.prisma.task.create({
      data: {
        projectId: parent.projectId,
        parentTaskId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId ?? null,
        createdBy: creatorId,
        status: dto.status ?? TaskStatus.todo,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours ?? null,
        position,
        path: `${parent.path}.`,
      },
    });

    await this.prisma.task.update({
      where: { id: task.id },
      data: { path: `${parent.path}.${task.id}` },
    });

    return this.getTaskById(task.id, creatorId);
  }

  // ─── Dependencies ─────────────────────────────────────────────────────────

  async createDependency(taskId: string, dto: CreateDependencyDto, userId: string) {
    const task = await this.checkAccess(taskId, userId);
    const depTask = await this.prisma.task.findUnique({ where: { id: dto.dependsOnTaskId } });

    if (!depTask || depTask.deletedAt) {
      throw new NotFoundException(`Task ${dto.dependsOnTaskId} not found`);
    }

    if (depTask.projectId !== task.projectId) {
      throw new BadRequestException('Both tasks must belong to the same project');
    }

    if (taskId === dto.dependsOnTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    if (await this.hasCircularDependency(taskId, dto.dependsOnTaskId)) {
      throw new BadRequestException('This dependency would create a circular reference');
    }

    return this.prisma.taskDependency.create({
      data: {
        taskId,
        dependsOn: dto.dependsOnTaskId,
        type: dto.type ?? DependencyType.finish_to_start,
      },
    });
  }

  async deleteDependency(taskId: string, depId: string, userId: string) {
    await this.checkAccess(taskId, userId);

    const dep = await this.prisma.taskDependency.findUnique({ where: { id: depId } });
    if (!dep || dep.taskId !== taskId) {
      throw new NotFoundException(`Dependency ${depId} not found`);
    }

    await this.prisma.taskDependency.delete({ where: { id: depId } });
    return { success: true };
  }

  // ─── Activity ─────────────────────────────────────────────────────────────

  async getTaskActivity(taskId: string, userId: string) {
    await this.checkAccess(taskId, userId);

    const [comments, auditLogs] = await Promise.all([
      this.prisma.comment.findMany({
        where: { entityType: 'task', entityId: taskId },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'task', entityId: taskId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const activities = [
      ...comments.map((c) => ({ type: 'comment' as const, createdAt: c.createdAt, data: c })),
      ...auditLogs.map((l) => ({ type: 'audit' as const, createdAt: l.createdAt, data: l })),
    ];
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activities.slice(0, 50);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async checkAccess(taskId: string, userId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new NotFoundException(`Task ${taskId} not found`);

    const canAccess = await this.visibility.canUserAccessProject(userId, task.projectId);
    if (!canAccess) throw new ForbiddenException('No access to this task');

    return task;
  }

  private async hasCircularDependency(taskId: string, proposedDependsOn: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [proposedDependsOn];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = await this.prisma.taskDependency.findMany({
        where: { taskId: current },
        select: { dependsOn: true },
      });
      queue.push(...deps.map((d) => d.dependsOn));
    }
    return false;
  }

  private buildTree<T extends { id: string; parentTaskId: string | null; subtasks?: unknown[] }>(
    tasks: T[],
  ): T[] {
    const map = new Map(tasks.map((t) => [t.id, { ...t, children: [] as T[] }]));
    const roots: (T & { children: T[] })[] = [];

    for (const t of tasks) {
      const node = map.get(t.id)!;
      if (t.parentTaskId && map.has(t.parentTaskId)) {
        map.get(t.parentTaskId)!.children.push(node as T);
      } else {
        roots.push(node);
      }
    }

    return roots as T[];
  }
}
