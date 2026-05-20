import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HierarchyService {
  constructor(private prisma: PrismaService) {}

  async setPath(userId: string, parentId: string | null): Promise<void> {
    if (parentId === null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { path: userId, depth: 0 },
      });
    } else {
      const parent = await this.prisma.user.findUnique({ where: { id: parentId } });
      if (!parent) throw new NotFoundException(`Parent user ${parentId} not found`);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          path: `${parent.path}.${userId}`,
          depth: parent.depth + 1,
        },
      });
    }

    await this.recomputeDescendantPaths(userId);
  }

  async getAncestors(userId: string): Promise<User[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const segments = user.path.split('.');
    const ancestorIds = segments.filter((id) => id !== userId);

    if (ancestorIds.length === 0) return [];

    const ancestors = await this.prisma.user.findMany({
      where: { id: { in: ancestorIds } },
    });

    // Return in root-to-parent order matching path segment order
    return ancestorIds
      .map((id) => ancestors.find((a) => a.id === id))
      .filter(Boolean) as User[];
  }

  async getDescendants(userId: string): Promise<User[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    return this.prisma.user.findMany({
      where: { path: { startsWith: `${user.path}.` } },
    });
  }

  // BFS top-down via reportsTo scalar FK (never uses stale path prefix)
  async recomputeDescendantPaths(userId: string): Promise<void> {
    const root = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!root) return;

    const queue: Array<{ id: string; path: string; depth: number }> = [
      { id: root.id, path: root.path, depth: root.depth },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      const children = await this.prisma.user.findMany({
        where: { reportsTo: current.id },
      });

      for (const child of children) {
        const newPath = `${current.path}.${child.id}`;
        const newDepth = current.depth + 1;

        await this.prisma.user.update({
          where: { id: child.id },
          data: { path: newPath, depth: newDepth },
        });

        queue.push({ id: child.id, path: newPath, depth: newDepth });
      }
    }
  }

  async isAncestorOf(ancestorId: string, descendantId: string): Promise<boolean> {
    const descendant = await this.prisma.user.findUnique({ where: { id: descendantId } });
    if (!descendant) return false;

    const segments = descendant.path.split('.');
    return segments.includes(ancestorId) && segments[segments.length - 1] !== ancestorId;
  }
}
