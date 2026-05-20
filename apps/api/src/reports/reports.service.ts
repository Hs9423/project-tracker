import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../users/hierarchy.service';
import { TimeTrackingQueryDto } from './dto/time-tracking-query.dto';
import { WorkloadQueryDto } from './dto/workload-query.dto';
import { TeamProductivityQueryDto } from './dto/team-productivity-query.dto';
import { ExportReportDto } from './dto/export-report.dto';

function workdaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(from);
  while (cur <= to) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count || 1;
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private hierarchy: HierarchyService,
    @InjectQueue('export') private exportQueue: Queue,
  ) {}

  // ─── Project Report ───────────────────────────────────────────────────────

  async getProjectReport(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        timeLogs: { select: { hours: true, userId: true, user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    const now = new Date();
    const statusCounts: Record<string, number> = {};
    let totalEstimatedHours = 0;
    let totalLoggedHours = 0;
    let overdueCount = 0;

    for (const t of tasks) {
      statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
      if (t.estimatedHours) totalEstimatedHours += Number(t.estimatedHours);
      if (t.dueDate && t.status !== 'done' && t.dueDate < now) overdueCount++;
      for (const log of t.timeLogs) totalLoggedHours += Number(log.hours);
    }

    const progressPercent = tasks.length
      ? Math.round(((statusCounts['done'] ?? 0) / tasks.length) * 100)
      : 0;

    // Per-member breakdown
    const memberMap = new Map<string, { id: string; name: string; avatarUrl: string | null; tasksAssigned: number; tasksDone: number; hoursLogged: number }>();

    for (const t of tasks) {
      if (!t.assignee) continue;
      const m = memberMap.get(t.assignee.id) ?? { ...t.assignee, tasksAssigned: 0, tasksDone: 0, hoursLogged: 0 };
      m.tasksAssigned++;
      if (t.status === 'done') m.tasksDone++;
      memberMap.set(t.assignee.id, m);
    }

    for (const t of tasks) {
      for (const log of t.timeLogs) {
        const m = memberMap.get(log.userId);
        if (m) m.hoursLogged += Number(log.hours);
      }
    }

    return {
      progressPercent,
      tasksByStatus: statusCounts,
      overdueCount,
      totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
      totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
      memberBreakdown: Array.from(memberMap.values()),
    };
  }

  // ─── Team Productivity ────────────────────────────────────────────────────

  async getTeamProductivity(userId: string, query: TeamProductivityQueryDto) {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400_000);
    const to = query.to ? new Date(query.to) : new Date();

    const descendants = await this.hierarchy.getDescendants(userId);
    const userIds = [userId, ...descendants.map(d => d.id)];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, name: true, avatarUrl: true },
    });

    const rows = await Promise.all(
      users.map(async (u) => {
        const completedTasks = await this.prisma.task.findMany({
          where: {
            assigneeId: u.id,
            status: 'done',
            updatedAt: { gte: from, lte: to },
            deletedAt: null,
          },
          select: { createdAt: true, updatedAt: true },
        });

        const overdueTasks = await this.prisma.task.count({
          where: {
            assigneeId: u.id,
            status: { not: 'done' },
            dueDate: { lt: to },
            deletedAt: null,
          },
        });

        const timeLogs = await this.prisma.timeLog.findMany({
          where: { userId: u.id, date: { gte: from, lte: to } },
          select: { hours: true },
        });

        const hoursLogged = timeLogs.reduce((s, l) => s + Number(l.hours), 0);
        const avgCompletionTime = completedTasks.length
          ? completedTasks.reduce((s, t) => s + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) / completedTasks.length / 86400_000
          : 0;

        return {
          user: u,
          tasksCompleted: completedTasks.length,
          hoursLogged: Math.round(hoursLogged * 100) / 100,
          overdueCount: overdueTasks,
          avgCompletionTimeDays: Math.round(avgCompletionTime * 10) / 10,
        };
      }),
    );

    return rows.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  }

  // ─── Time Tracking ────────────────────────────────────────────────────────

  async getTimeTracking(requesterId: string, query: TimeTrackingQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const descendants = await this.hierarchy.getDescendants(requesterId);
    const allowedUserIds = [requesterId, ...descendants.map(d => d.id)];

    const logs = await this.prisma.timeLog.findMany({
      where: {
        ...(query.userId ? { userId: query.userId } : { userId: { in: allowedUserIds } }),
        ...(query.projectId ? { task: { projectId: query.projectId } } : {}),
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, title: true } } } },
      },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
    });

    // Group by user then project
    const byUser = new Map<string, { user: typeof logs[0]['user']; byProject: Map<string, { project: { id: string; title: string }; logs: typeof logs; total: number }>; total: number }>();

    for (const log of logs) {
      if (!byUser.has(log.userId)) {
        byUser.set(log.userId, { user: log.user, byProject: new Map(), total: 0 });
      }
      const userRow = byUser.get(log.userId)!;
      userRow.total += Number(log.hours);

      const projId = log.task.projectId;
      if (!userRow.byProject.has(projId)) {
        userRow.byProject.set(projId, { project: log.task.project as { id: string; title: string }, logs: [], total: 0 });
      }
      const projRow = userRow.byProject.get(projId)!;
      projRow.logs.push(log);
      projRow.total += Number(log.hours);
    }

    const grouped = Array.from(byUser.values()).map(u => ({
      user: u.user,
      totalHours: Math.round(u.total * 100) / 100,
      projects: Array.from(u.byProject.values()).map(p => ({
        project: p.project,
        totalHours: Math.round(p.total * 100) / 100,
        logs: p.logs.map(l => ({
          id: l.id,
          date: l.date,
          hours: Number(l.hours),
          note: l.note,
          task: { id: l.task.id, title: l.task.title },
        })),
      })),
    }));

    const grandTotal = logs.reduce((s, l) => s + Number(l.hours), 0);
    const days = from && to ? Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400_000)) : 30;

    return {
      grouped,
      summary: {
        totalHours: Math.round(grandTotal * 100) / 100,
        avgHoursPerDay: Math.round((grandTotal / days) * 100) / 100,
        totalEntries: logs.length,
      },
    };
  }

  // ─── Workload ─────────────────────────────────────────────────────────────

  async getWorkload(userId: string, query: WorkloadQueryDto) {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400_000);
    const to = query.to ? new Date(query.to) : new Date();

    const descendants = await this.hierarchy.getDescendants(userId);
    const userIds = [userId, ...descendants.map(d => d.id)];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, name: true, avatarUrl: true },
    });

    const workdays = workdaysBetween(from, to);

    const rows = await Promise.all(
      users.map(async (u) => {
        const tasks = await this.prisma.task.findMany({
          where: { assigneeId: u.id, deletedAt: null },
          select: { status: true, estimatedHours: true, dueDate: true },
        });

        const timeLogs = await this.prisma.timeLog.findMany({
          where: { userId: u.id, date: { gte: from, lte: to } },
          select: { hours: true },
        });

        const estimatedHours = tasks.reduce((s, t) => s + Number(t.estimatedHours ?? 0), 0);
        const loggedHours = timeLogs.reduce((s, l) => s + Number(l.hours), 0);
        const overdueCount = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < to).length;
        const loadPercent = Math.round((loggedHours / (workdays * 8)) * 100);

        const tasksByStatus: Record<string, number> = {};
        for (const t of tasks) {
          tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
        }

        return {
          user: u,
          taskCount: tasks.length,
          estimatedHours: Math.round(estimatedHours * 100) / 100,
          loggedHours: Math.round(loggedHours * 100) / 100,
          overdueCount,
          loadPercent,
          tasksByStatus,
        };
      }),
    );

    return rows;
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async queueExport(dto: ExportReportDto, userId: string): Promise<{ jobId: string }> {
    const job = await this.exportQueue.add('generate', { ...dto, userId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false,
      removeOnFail: false,
    });
    return { jobId: String(job.id) };
  }

  async getExportStatus(jobId: string): Promise<{ status: 'pending' | 'ready' | 'failed'; downloadUrl?: string }> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) return { status: 'pending' };

    const state = await job.getState();
    if (state === 'completed') {
      return { status: 'ready', downloadUrl: `/reports/export/${jobId}/download` };
    }
    if (state === 'failed') {
      return { status: 'failed' };
    }
    return { status: 'pending' };
  }
}
