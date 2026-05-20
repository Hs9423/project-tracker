import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';

@Module({
  imports: [ProjectsModule],
  providers: [LinksService],
  controllers: [LinksController],
})
export class LinksModule {}
