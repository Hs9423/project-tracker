import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId =
      request.params.id ?? request.params.projectId;

    if (!projectId) return true;

    const visibility = await this.prisma.projectVisibility.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });

    if (!visibility) {
      throw new ForbiddenException('No access to this project');
    }

    return true;
  }
}
