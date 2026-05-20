import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, ProjectsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
