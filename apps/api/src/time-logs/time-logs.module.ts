import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TimeLogsService } from './time-logs.service';
import { TimeLogsController } from './time-logs.controller';

@Module({
  imports: [ProjectsModule],
  providers: [TimeLogsService],
  controllers: [TimeLogsController],
})
export class TimeLogsModule {}
