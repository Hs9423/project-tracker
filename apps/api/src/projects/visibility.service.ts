import { Injectable } from '@nestjs/common';
import { VisibilityReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../users/hierarchy.service';

@Injectable()
export class VisibilityService {
  constructor(
    private prisma: PrismaService,
    private hierarchy: HierarchyService,
  ) {}

  async computeVisibility(projectId: string, assigneeIds: string[]): Promise<void> {
    // 1. Upsert assignee entries
    for (const userId of assigneeIds) {
      await this.prisma.projectVisibility.upsert({
        where: { projectId_userId: { projectId, userId } },
        create: { projectId, userId, reason: VisibilityReason.assignee },
        update: {},
      });
    }

    // 2. For each assignee, walk their ancestors and upsert ancestor entries
    for (const assigneeId of assigneeIds) {
      const ancestors = await this.hierarchy.getAncestors(assigneeId);
      for (const ancestor of ancestors) {
        await this.prisma.projectVisibility.upsert({
          where: { projectId_userId: { projectId, userId: ancestor.id } },
          create: { projectId, userId: ancestor.id, reason: VisibilityReason.ancestor },
          update: {},
        });
      }
    }

    // 3. Co-assignee: multiple assignees each see the project via co-assignment;
    //    update:{} preserves existing (stronger) reason such as assignee
    if (assigneeIds.length > 1) {
      for (const userId of assigneeIds) {
        await this.prisma.projectVisibility.upsert({
          where: { projectId_userId: { projectId, userId } },
          create: { projectId, userId, reason: VisibilityReason.co_assignee },
          update: {},
        });
      }
    }
  }

  async recomputeOnHierarchyChange(movedUserId: string): Promise<void> {
    // Include the moved user and all their descendants
    const descendants = await this.hierarchy.getDescendants(movedUserId);
    const affectedUserIds = [movedUserId, ...descendants.map((d) => d.id)];

    // Find projects where any of these users are direct assignees
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { assignedTo: { in: affectedUserIds } },
      select: { projectId: true },
      distinct: ['projectId'],
    });

    for (const { projectId } of assignments) {
      // Drop stale ancestor entries; recompute will regenerate them correctly
      await this.prisma.projectVisibility.deleteMany({
        where: { projectId, reason: VisibilityReason.ancestor },
      });

      const currentAssignees = await this.prisma.projectAssignment.findMany({
        where: { projectId },
        select: { assignedTo: true },
      });

      await this.computeVisibility(
        projectId,
        currentAssignees.map((a) => a.assignedTo),
      );
    }
  }

  async canUserAccessProject(userId: string, projectId: string): Promise<boolean> {
    const entry = await this.prisma.projectVisibility.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return entry !== null;
  }
}
