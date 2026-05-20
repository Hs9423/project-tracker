import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../projects/visibility.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class LinksService {
  constructor(
    private prisma: PrismaService,
    private visibility: VisibilityService,
  ) {}

  async create(dto: CreateLinkDto, userId: string) {
    await this.checkEntityAccess(dto.entityType, dto.entityId, userId);

    return this.prisma.link.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        url: dto.url,
        label: dto.label,
        addedBy: userId,
      },
    });
  }

  async listForEntity(entityType: EntityType, entityId: string, userId: string) {
    await this.checkEntityAccess(entityType, entityId, userId);

    return this.prisma.link.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(linkId: string, dto: UpdateLinkDto, userId: string) {
    const link = await this.prisma.link.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException(`Link ${linkId} not found`);
    if (link.addedBy !== userId) throw new ForbiddenException('Can only edit your own links');

    return this.prisma.link.update({
      where: { id: linkId },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.label !== undefined && { label: dto.label }),
      },
    });
  }

  async delete(linkId: string, userId: string) {
    const link = await this.prisma.link.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException(`Link ${linkId} not found`);
    if (link.addedBy !== userId) throw new ForbiddenException('Can only delete your own links');

    await this.prisma.link.delete({ where: { id: linkId } });
    return { success: true };
  }

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
}
