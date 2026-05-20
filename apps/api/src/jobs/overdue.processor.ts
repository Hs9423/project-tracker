import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class OverdueProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 9 * * *')
  async checkOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: today },
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
        NotificationType.task_overdue,
        'task',
        task.id,
        `Task "${task.title}" is overdue`,
      );
    }
  }
}
