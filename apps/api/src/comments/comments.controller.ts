import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@project-tracker/shared';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // POST /comments
  @Post()
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: JwtPayload) {
    return this.commentsService.create(dto, user.sub);
  }

  // GET /comments?entity_type=task&entity_id=uuid
  @Get()
  list(
    @Query('entity_type') entityType: EntityType,
    @Query('entity_id') entityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.listForEntity(entityType, entityId, user.sub);
  }

  // PATCH /comments/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.update(id, dto, user.sub);
  }

  // DELETE /comments/:id
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.commentsService.delete(id, user.sub);
  }
}
