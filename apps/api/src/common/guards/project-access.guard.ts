import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { VisibilityService } from '../../projects/visibility.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private visibilityService: VisibilityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id ?? request.params.projectId;

    if (!projectId) return true;

    const canAccess = await this.visibilityService.canUserAccessProject(user.id, projectId);

    if (!canAccess) {
      throw new ForbiddenException('No access to this project');
    }

    return true;
  }
}
