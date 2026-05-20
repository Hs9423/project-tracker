import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from './hierarchy.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private hierarchy: HierarchyService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        role: true, reportsTo: true, path: true, depth: true,
        isActive: true, emailNotifications: true, notificationDigest: true,
        createdAt: true, updatedAt: true,
        manager: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...(dto.name ? { name: dto.name } : {}), ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}) },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true, emailNotifications: true, notificationDigest: true },
    });
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailNotifications: true, notificationDigest: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePreferences(userId: string, dto: { emailNotifications?: boolean; notificationDigest?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.emailNotifications !== undefined ? { emailNotifications: dto.emailNotifications } : {}),
        ...(dto.notificationDigest ? { notificationDigest: dto.notificationDigest } : {}),
      },
      select: { emailNotifications: true, notificationDigest: true },
    });
  }

  async getTeam(userId: string) {
    const descendants = await this.hierarchy.getDescendants(userId);
    return this.prisma.user.findMany({
      where: { id: { in: descendants.map(d => d.id) }, isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true, depth: true, reportsTo: true },
      orderBy: { depth: 'asc' },
    });
  }

  async getProjectsForUser(targetUserId: string) {
    const visibleIds = await this.prisma.projectVisibility.findMany({
      where: { userId: targetUserId },
      select: { projectId: true },
    });
    return this.prisma.project.findMany({
      where: { id: { in: visibleIds.map(v => v.projectId) } },
      include: {
        assignments: { include: { assignee: { select: { id: true, name: true, avatarUrl: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTimesheet(userId: string, week?: string) {
    // week format: "2024-W20"
    const { from, to } = parseWeekRange(week);
    const logs = await this.prisma.timeLog.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: {
        task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, title: true } } } },
      },
      orderBy: { date: 'asc' },
    });
    return { logs, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }
}

function parseWeekRange(week?: string): { from: Date; to: Date } {
  if (!week) {
    const from = new Date();
    from.setDate(from.getDate() - from.getDay() + 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  const [yearStr, weekStr] = week.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekStr, 10);
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1);
  const from = new Date(startOfWeek1);
  from.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}
