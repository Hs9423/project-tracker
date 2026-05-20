import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../users/hierarchy.service';
import { VisibilityService } from '../projects/visibility.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeParentDto } from './dto/change-parent.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private hierarchy: HierarchyService,
    private visibility: VisibilityService,
  ) {}

  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(query: ListUsersQueryDto) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { isActive: true };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ depth: 'asc' }, { name: 'asc' }],
        include: { manager: { select: { id: true, name: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.sanitize),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async createUser(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role ?? Role.user,
        reportsTo: dto.reportsToId ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        path: '',
        depth: 0,
      },
    });

    await this.hierarchy.setPath(user.id, dto.reportsToId ?? null);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'user.create',
        entityType: 'user',
        entityId: user.id,
        metadata: { name: user.name, email: user.email, role: user.role },
      },
    });

    const updated = await this.prisma.user.findUnique({ where: { id: user.id } });
    return this.sanitize(updated!);
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.findActiveUser(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('Email already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'user.update',
        entityType: 'user',
        entityId: id,
        metadata: {
          oldValues: { name: user.name, email: user.email, avatarUrl: user.avatarUrl },
          newValues: { name: updated.name, email: updated.email, avatarUrl: updated.avatarUrl },
        },
      },
    });

    return this.sanitize(updated);
  }

  async changeParent(id: string, dto: ChangeParentDto, actorId: string) {
    const user = await this.findActiveUser(id);
    const oldParent = user.reportsTo;
    const newParent = dto.parentId ?? null;

    await this.prisma.user.update({
      where: { id },
      data: { reportsTo: newParent },
    });

    await this.hierarchy.setPath(id, newParent);
    await this.visibility.recomputeOnHierarchyChange(id);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'user.changeParent',
        entityType: 'user',
        entityId: id,
        metadata: { oldValues: { reportsTo: oldParent }, newValues: { reportsTo: newParent } },
      },
    });

    const updated = await this.prisma.user.findUnique({ where: { id } });
    return this.sanitize(updated!);
  }

  async deleteUser(id: string, actorId: string) {
    await this.findActiveUser(id);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'user.delete',
        entityType: 'user',
        entityId: id,
        metadata: { isActive: false },
      },
    });

    return { success: true };
  }

  // ─── Org Chart ────────────────────────────────────────────────────────────

  async getOrgChart() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true, depth: true, reportsTo: true },
    });

    const nodeMap = new Map<string, OrgNode>();
    const roots: OrgNode[] = [];

    for (const user of users) {
      nodeMap.set(user.id, { ...user, children: [] });
    }

    for (const user of users) {
      const node = nodeMap.get(user.id)!;
      if (user.reportsTo && nodeMap.has(user.reportsTo)) {
        nodeMap.get(user.reportsTo)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const { actorId, action, from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findActiveUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  private sanitize(user: Record<string, unknown>) {
    const { passwordHash: _, ...rest } = user as { passwordHash: string } & Record<string, unknown>;
    return rest;
  }
}

export interface OrgNode {
  id: string;
  name: string;
  role: Role;
  depth: number;
  reportsTo: string | null;
  children: OrgNode[];
}
