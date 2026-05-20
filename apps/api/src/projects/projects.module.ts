import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { VisibilityService } from './visibility.service';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';

@Module({
  imports: [UsersModule],
  providers: [VisibilityService, ProjectsService, ProjectAccessGuard],
  controllers: [ProjectsController],
  exports: [VisibilityService, ProjectAccessGuard],
})
export class ProjectsModule {}
