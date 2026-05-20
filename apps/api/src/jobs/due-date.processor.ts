import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class DueDateProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async checkDueDates() {
    const target = new Date();
    target.setDate(target.getDate() + 2);
    const dateStr = target.toISOString().slice(0, 10);

    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { gte: new Date(dateStr), lt: new Date(new Date(dateStr).getTime() + 86400000) },
        status: { not: 'done' },
        assigneeId: { not: null },
        deletedAt: null,
      },
      select: { id: true, title: true, assigneeId: true },
    });

    for (const task of tasks) {
      if (!task.assigneeId) continue;
      await this.notifications.createAndEmit(
        task.assigneeId,
        NotificationType.due_date_approaching,
        'task',
        task.id,
        `Task "${task.title}" is due in 2 days`,
      );
    }
  }
}
