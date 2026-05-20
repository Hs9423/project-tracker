import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EntityType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../projects/visibility.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true };

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private visibility: VisibilityService,
    @Optional() private notifications: NotificationsService,
  ) {}

  async create(dto: CreateCommentDto, authorId: string) {
    await this.checkEntityAccess(dto.entityType, dto.entityId, authorId);

    const comment = await this.prisma.comment.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        body: dto.body as Prisma.InputJsonValue,
        authorId,
        parentId: dto.parentId ?? null,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });

    const mentionedUserIds = this.extractMentions(dto.body);

    if (this.notifications) {
      await this.notifyOnComment(comment, authorId, mentionedUserIds);
    }

    return { comment, mentionedUserIds };
  }

  private async notifyOnComment(
    comment: { id: string; entityType: EntityType; entityId: string },
    authorId: string,
    mentionedUserIds: string[],
  ) {
    const notified = new Set<string>([authorId]);

    // Find entity owner
    let ownerId: string | null = null;
    if (comment.entityType === EntityType.project) {
      const project = await this.prisma.project.findUnique({
        where: { id: comment.entityId },
        select: { createdBy: true },
      });
      ownerId = project?.createdBy ?? null;
    } else {
      const task = await this.prisma.task.findUnique({
        where: { id: comment.entityId },
        select: { createdBy: true },
      });
      ownerId = task?.createdBy ?? null;
    }

    if (ownerId && !notified.has(ownerId)) {
      notified.add(ownerId);
      await this.notifications!.createAndEmit(
        ownerId,
        NotificationType.comment_added,
        comment.entityType,
        comment.entityId,
        'New comment on your item',
      );
    }

    // Notify previous commenters on same entity
    const prevCommenters = await this.prisma.comment.findMany({
      where: { entityType: comment.entityType, entityId: comment.entityId, id: { not: comment.id } },
      select: { authorId: true },
      distinct: ['authorId'],
    });
    for (const { authorId: prevAuthor } of prevCommenters) {
      if (!notified.has(prevAuthor)) {
        notified.add(prevAuthor);
        await this.notifications!.createAndEmit(
          prevAuthor,
          NotificationType.comment_added,
          comment.entityType,
          comment.entityId,
          'New comment on a thread you participated in',
        );
      }
    }

    // Notify mentioned users
    for (const mentionedId of mentionedUserIds) {
      if (!notified.has(mentionedId)) {
        notified.add(mentionedId);
        await this.notifications!.createAndEmit(
          mentionedId,
          NotificationType.mention,
          comment.entityType,
          comment.entityId,
          'You were mentioned in a comment',
        );
      }
    }
  }

  async listForEntity(entityType: EntityType, entityId: string, userId: string) {
    await this.checkEntityAccess(entityType, entityId, userId);

    const all = await this.prisma.comment.findMany({
      where: { entityType, entityId },
      include: { author: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: 'asc' },
    });

    // Build threaded structure: top-level first, replies nested
    return this.buildThreaded(all);
  }

  async update(commentId: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);
    if (comment.authorId !== userId) throw new ForbiddenException('Can only edit your own comments');

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body as Prisma.InputJsonValue, isEdited: true },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);
    if (comment.authorId !== userId) throw new ForbiddenException('Can only delete your own comments');

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async checkEntityAccess(
    entityType: EntityType,
    entityId: string,
    userId: string,
  ): Promise<void> {
    if (entityType === EntityType.project) {
      const canAccess = await this.visibility.canUserAccessProject(userId, entityId);
      if (!canAccess) throw new ForbiddenException('No access to this project');
    } else {
      const task = await this.prisma.task.findUnique({ where: { id: entityId } });
      if (!task || task.deletedAt) throw new NotFoundException(`Task ${entityId} not found`);
      const canAccess = await this.visibility.canUserAccessProject(userId, task.projectId);
      if (!canAccess) throw new ForbiddenException('No access to this task');
    }
  }

  private extractMentions(body: unknown): string[] {
    const mentions: string[] = [];

    function traverse(node: unknown): void {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(traverse); return; }
      const obj = node as Record<string, unknown>;
      if (obj.type === 'mention' && obj.attrs && typeof obj.attrs === 'object') {
        const attrs = obj.attrs as Record<string, unknown>;
        if (typeof attrs.id === 'string') mentions.push(attrs.id);
      }
      Object.values(obj).forEach(traverse);
    }

    traverse(body);
    return [...new Set(mentions)];
  }

  private buildThreaded<T extends { id: string; parentId: string | null; replies?: T[] }>(
    comments: T[],
  ): T[] {
    const map = new Map(comments.map((c) => [c.id, { ...c, replies: [] as T[] }]));
    const roots: (T & { replies: T[] })[] = [];

    for (const c of comments) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(node as T);
      } else {
        roots.push(node);
      }
    }

    return roots as T[];
  }
}
