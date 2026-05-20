import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
  imports: [ProjectsModule],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
