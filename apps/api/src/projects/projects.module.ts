import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { VisibilityService } from './visibility.service';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';

@Module({
  imports: [UsersModule],
  providers: [VisibilityService, ProjectAccessGuard],
  exports: [VisibilityService, ProjectAccessGuard],
})
export class ProjectsModule {}
