import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../projects/visibility.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { UpdateTimeLogDto } from './dto/update-time-log.dto';

const USER_SELECT = { id: true, name: true, avatarUrl: true };

@Injectable()
export class TimeLogsService {
  constructor(
    private prisma: PrismaService,
    private visibility: VisibilityService,
  ) {}

  async create(taskId: string, dto: CreateTimeLogDto, userId: string) {
    const task = await this.getAccessibleTask(taskId, userId);

    // Only task assignee or project assignee can log time
    const isTaskAssignee = task.assigneeId === userId;
    const isProjectAssignee = await this.prisma.projectAssignment.findUnique({
      where: { projectId_assignedTo: { projectId: task.projectId, assignedTo: userId } },
    });

    if (!isTaskAssignee && !isProjectAssignee) {
      throw new ForbiddenException('Only task or project assignees can log time');
    }

    return this.prisma.timeLog.create({
      data: {
        taskId,
        userId,
        date: new Date(dto.date),
        hours: dto.hours,
        note: dto.note,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async listForTask(taskId: string, userId: string) {
    await this.getAccessibleTask(taskId, userId);

    return this.prisma.timeLog.findMany({
      where: { taskId },
      include: { user: { select: USER_SELECT } },
      orderBy: { date: 'desc' },
    });
  }

  async update(logId: string, dto: UpdateTimeLogDto, userId: string) {
    const log = await this.prisma.timeLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException(`Time log ${logId} not found`);
    if (log.userId !== userId) throw new ForbiddenException('Can only edit your own time logs');

    return this.prisma.timeLog.update({
      where: { id: logId },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.hours !== undefined && { hours: dto.hours }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async delete(logId: string, userId: string) {
    const log = await this.prisma.timeLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException(`Time log ${logId} not found`);
    if (log.userId !== userId) throw new ForbiddenException('Can only delete your own time logs');

    await this.prisma.timeLog.delete({ where: { id: logId } });
    return { success: true };
  }

  async getMyTimesheet(userId: string, week: string) {
    const { start, end } = this.parseISOWeek(week);

    const logs = await this.prisma.timeLog.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: { task: { select: { id: true, title: true, projectId: true } } },
      orderBy: { date: 'asc' },
    });

    const byDay: Record<string, { hours: number; logs: typeof logs }> = {};
    let weekTotal = 0;

    for (const log of logs) {
      const day = log.date.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { hours: 0, logs: [] };
      byDay[day].hours += Number(log.hours);
      byDay[day].logs.push(log);
      weekTotal += Number(log.hours);
    }

    return { week, byDay, weekTotal };
  }

  private async getAccessibleTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new NotFoundException(`Task ${taskId} not found`);

    const canAccess = await this.visibility.canUserAccessProject(userId, task.projectId);
    if (!canAccess) throw new ForbiddenException('No access to this task');

    return task;
  }

  private parseISOWeek(week: string): { start: Date; end: Date } {
    const match = week.match(/^(\d{4})-W(\d{1,2})$/);
    if (!match) throw new BadRequestException('Invalid week format. Use YYYY-Www (e.g. 2026-W25)');

    const year = parseInt(match[1]);
    const weekNum = parseInt(match[2]);

    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

    const start = new Date(mondayWeek1);
    start.setUTCDate(mondayWeek1.getUTCDate() + (weekNum - 1) * 7);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
  }
}
