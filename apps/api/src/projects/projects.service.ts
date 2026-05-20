import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationType, Priority, ProjectStatus, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../users/hierarchy.service';
import { VisibilityService } from './visibility.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';

const ASSIGNEE_SELECT = { id: true, name: true, avatarUrl: true, email: true };

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private hierarchy: HierarchyService,
    private visibility: VisibilityService,
    @Optional() private notifications: NotificationsService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateProjectDto, creatorId: string) {
    await this.validateAssignees(dto.assignedTo, creatorId);

    const project = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          title: dto.title,
          description: dto.description,
          createdBy: creatorId,
          status: dto.status ?? ProjectStatus.planning,
          priority: dto.priority ?? Priority.medium,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          tags: dto.tags ?? [],
        },
      });

      await tx.projectAssignment.createMany({
        data: dto.assignedTo.map((userId) => ({
          projectId: p.id,
          assignedTo: userId,
          assignedBy: creatorId,
        })),
      });

      return p;
    });

    await this.visibility.computeVisibility(project.id, dto.assignedTo);

    if (this.notifications) {
      for (const assigneeId of dto.assignedTo.filter((id) => id !== creatorId)) {
        await this.notifications.createAndEmit(
          assigneeId,
          NotificationType.project_assigned,
          'project',
          project.id,
          `You have been assigned to project "${dto.title}"`,
        );
      }
    }

    return this.getById(project.id);
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async list(userId: string, query: ListProjectsQueryDto) {
    const visibleIds = await this.prisma.projectVisibility.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = visibleIds.map((v) => v.projectId);

    const where: Record<string, unknown> = { id: { in: projectIds } };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.tags?.length) where.tags = { hasSome: query.tags };

    const orderBy = this.buildOrderBy(query.sortBy, query.order);

    const projects = await this.prisma.project.findMany({
      where,
      orderBy,
      include: {
        assignments: {
          include: { assignee: { select: ASSIGNEE_SELECT } },
          take: 5,
        },
        _count: { select: { tasks: true } },
      },
    });

    if (projects.length === 0) return [];

    // Task counts by status per project
    const taskStats = await this.prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds }, deletedAt: null },
      _count: { id: true },
    });

    return projects.map((p) => {
      const stats = taskStats.filter((s) => s.projectId === p.id);
      const tasksByStatus = Object.fromEntries(stats.map((s) => [s.status, s._count.id]));
      return { ...p, tasksByStatus };
    });
  }

  // ─── Get by ID ────────────────────────────────────────────────────────────

  async getById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        assignments: {
          include: { assignee: { select: ASSIGNEE_SELECT } },
        },
        creator: { select: ASSIGNEE_SELECT },
      },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const [taskStats, totalTimeResult, linksCount] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.timeLog.aggregate({
        where: { task: { projectId } },
        _sum: { hours: true },
      }),
      this.prisma.link.count({ where: { entityType: 'project', entityId: projectId } }),
    ]);

    const tasksByStatus = Object.fromEntries(
      Object.values(TaskStatus).map((s) => [s, 0]),
    );
    for (const s of taskStats) tasksByStatus[s.status] = s._count.id;

    return {
      ...project,
      tasksByStatus,
      totalHoursLogged: Number(totalTimeResult._sum.hours ?? 0),
      linksCount,
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(projectId: string, dto: UpdateProjectDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (dto.assignedTo) {
      await this.validateAssignees(dto.assignedTo, actorId);
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.tags && { tags: dto.tags }),
      },
    });

    if (dto.assignedTo) {
      await this.prisma.$transaction([
        this.prisma.projectVisibility.deleteMany({ where: { projectId } }),
        this.prisma.projectAssignment.deleteMany({ where: { projectId } }),
      ]);

      await this.prisma.projectAssignment.createMany({
        data: dto.assignedTo.map((userId) => ({
          projectId,
          assignedTo: userId,
          assignedBy: actorId,
        })),
      });

      await this.visibility.computeVisibility(projectId, dto.assignedTo);
    }

    return this.getById(projectId);
  }

  // ─── Team ─────────────────────────────────────────────────────────────────

  async getTeam(projectId: string) {
    return this.prisma.projectVisibility.findMany({
      where: { projectId },
      include: { user: { select: { ...ASSIGNEE_SELECT, depth: true, path: true } } },
      orderBy: { user: { depth: 'asc' } },
    });
  }

  // ─── Gantt ────────────────────────────────────────────────────────────────

  async getGantt(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignee: { select: ASSIGNEE_SELECT },
        dependsOn: { select: { dependsOn: true, type: true } },
      },
      orderBy: { position: 'asc' },
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      startDate: t.startDate,
      dueDate: t.dueDate,
      baselineStartDate: t.baselineStartDate,
      baselineDueDate: t.baselineDueDate,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
      parentTaskId: t.parentTaskId,
      estimatedHours: t.estimatedHours,
      dependencies: t.dependsOn.map((d) => ({ taskId: d.dependsOn, type: d.type })),
    }));
  }

  // ─── Kanban ───────────────────────────────────────────────────────────────

  async getKanban(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignee: { select: ASSIGNEE_SELECT },
        _count: { select: { subtasks: true, timeLogs: true } },
      },
      orderBy: { position: 'asc' },
    });

    // Fetch logged hours per task
    const taskIds = tasks.map((t) => t.id);
    const timeStats = await this.prisma.timeLog.groupBy({
      by: ['taskId'],
      where: { taskId: { in: taskIds } },
      _sum: { hours: true },
    });
    const hoursMap = new Map(timeStats.map((s) => [s.taskId, Number(s._sum.hours ?? 0)]));

    const grouped: Record<TaskStatus, unknown[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      blocked: [],
      done: [],
    };

    for (const t of tasks) {
      grouped[t.status].push({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        assignee: t.assignee,
        subtaskCount: t._count.subtasks,
        timeLogged: hoursMap.get(t.id) ?? 0,
        parentTaskId: t.parentTaskId,
      });
    }

    return grouped;
  }

  // ─── Workload ─────────────────────────────────────────────────────────────

  async getWorkload(projectId: string) {
    const visibilityEntries = await this.prisma.projectVisibility.findMany({
      where: { projectId },
      include: { user: { select: ASSIGNEE_SELECT } },
    });

    const userIds = visibilityEntries.map((v) => v.userId);
    const projectTaskIds = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });
    const taskIdList = projectTaskIds.map((t) => t.id);
    const now = new Date();

    const [taskStats, timeStats, overdueStats] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['assigneeId', 'status'],
        where: { projectId, deletedAt: null, assigneeId: { in: userIds } },
        _count: { id: true },
        _sum: { estimatedHours: true },
      }),
      this.prisma.timeLog.groupBy({
        by: ['userId'],
        where: { taskId: { in: taskIdList }, userId: { in: userIds } },
        _sum: { hours: true },
      }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          projectId,
          deletedAt: null,
          assigneeId: { in: userIds },
          dueDate: { lt: now },
          status: { notIn: [TaskStatus.done] },
        },
        _count: { id: true },
      }),
    ]);

    return visibilityEntries
      .map((entry) => {
        const uid = entry.userId;
        const userTaskStats = taskStats.filter((s) => s.assigneeId === uid);
        const taskCount = userTaskStats.reduce((sum, s) => sum + s._count.id, 0);
        const estimatedHours = userTaskStats.reduce(
          (sum, s) => sum + Number(s._sum.estimatedHours ?? 0),
          0,
        );
        const loggedHours = Number(
          timeStats.find((s) => s.userId === uid)?._sum.hours ?? 0,
        );
        const overdueCount = overdueStats.find((s) => s.assigneeId === uid)?._count.id ?? 0;
        const tasksByStatus = Object.fromEntries(userTaskStats.map((s) => [s.status, s._count.id]));

        return {
          user: entry.user,
          reason: entry.reason,
          taskCount,
          estimatedHours,
          loggedHours,
          overdueCount,
          tasksByStatus,
        };
      })
      .sort((a, b) => b.taskCount - a.taskCount);
  }

  // ─── Time Report ──────────────────────────────────────────────────────────

  async getTimeReport(projectId: string) {
    const projectTaskIds = await this.prisma.task.findMany({
      where: { projectId },
      select: { id: true },
    });
    const taskIdList = projectTaskIds.map((t) => t.id);

    const logs = await this.prisma.timeLog.findMany({
      where: { taskId: { in: taskIdList } },
      include: {
        user: { select: ASSIGNEE_SELECT },
        task: { select: { id: true, title: true } },
      },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
    });

    const byUser: Record<string, { user: typeof ASSIGNEE_SELECT; totalHours: number; byDate: Record<string, number> }> = {};
    let grandTotal = 0;

    for (const log of logs) {
      const uid = log.userId;
      const dateKey = log.date.toISOString().split('T')[0];
      const hours = Number(log.hours);

      if (!byUser[uid]) {
        byUser[uid] = { user: log.user as unknown as typeof ASSIGNEE_SELECT, totalHours: 0, byDate: {} };
      }
      byUser[uid].byDate[dateKey] = (byUser[uid].byDate[dateKey] ?? 0) + hours;
      byUser[uid].totalHours += hours;
      grandTotal += hours;
    }

    return { byUser: Object.values(byUser), grandTotal };
  }

  // ─── Activity ─────────────────────────────────────────────────────────────

  async getActivity(projectId: string) {
    const projectTaskIds = await this.prisma.task.findMany({
      where: { projectId },
      select: { id: true },
    });
    const taskIdList = projectTaskIds.map((t) => t.id);

    const [comments, auditLogs] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          OR: [
            { entityType: 'project', entityId: projectId },
            { entityType: 'task', entityId: { in: taskIdList } },
          ],
        },
        include: { author: { select: ASSIGNEE_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: 'project', entityId: projectId },
            { entityType: 'task', entityId: { in: taskIdList } },
          ],
        },
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

  private async validateAssignees(assigneeIds: string[], creatorId: string): Promise<void> {
    for (const userId of assigneeIds) {
      if (userId === creatorId) continue;
      const isDescendant = await this.hierarchy.isAncestorOf(creatorId, userId);
      if (!isDescendant) {
        throw new BadRequestException(
          `User ${userId} is not a descendant of the current user`,
        );
      }
    }
  }

  private buildOrderBy(
    sortBy?: string,
    order: 'asc' | 'desc' = 'desc',
  ): Record<string, string> {
    const field = sortBy ?? 'createdAt';
    return { [field]: order };
  }
}
