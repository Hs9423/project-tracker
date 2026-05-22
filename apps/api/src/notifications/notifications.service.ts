import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EntityType, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async createAndEmit(
    recipientId: string,
    type: NotificationType,
    entityType: EntityType | null,
    entityId: string | null,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { recipientId, type, entityType, entityId, message },
    });

    this.gateway.emitToUser(recipientId, 'notification', notification);

    try {
      await this.emailQueue.add(
        'send',
        { notificationId: notification.id, recipientId, type, message, entityType, entityId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true },
      );
    } catch {
      // Redis unavailable — notification created but email queuing skipped
    }

    return notification;
  }

  async listForUser(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { recipientId: userId } }),
      this.prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);
    return { notifications, total, unreadCount, page, pages: Math.ceil(total / limit) };
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  emitToRoom(userId: string, event: string, data: unknown) {
    this.gateway.emitToUser(userId, event, data);
  }

  async emitTaskUpdate(projectId: string, taskId: string, payload: unknown) {
    const visibility = await this.prisma.projectVisibility.findMany({
      where: { projectId },
      select: { userId: true },
    });
    for (const { userId } of visibility) {
      this.gateway.emitToUser(userId, 'task:updated', { taskId, projectId, ...payload as object });
    }
  }

  async emitCommentNew(entityType: string, entityId: string, comment: unknown) {
    let projectId: string | null = null;
    if (entityType === 'project') {
      projectId = entityId;
    } else {
      const task = await this.prisma.task.findUnique({ where: { id: entityId }, select: { projectId: true } });
      projectId = task?.projectId ?? null;
    }
    if (!projectId) return;

    const visibility = await this.prisma.projectVisibility.findMany({
      where: { projectId },
      select: { userId: true },
    });
    for (const { userId } of visibility) {
      this.gateway.emitToUser(userId, 'comment:new', { entityType, entityId, comment });
    }
  }
}
