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
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  // POST /links
  @Post()
  create(@Body() dto: CreateLinkDto, @CurrentUser() user: JwtPayload) {
    return this.linksService.create(dto, user.sub);
  }

  // GET /links?entity_type=task&entity_id=uuid
  @Get()
  list(
    @Query('entity_type') entityType: EntityType,
    @Query('entity_id') entityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.linksService.listForEntity(entityType, entityId, user.sub);
  }

  // PATCH /links/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.linksService.update(id, dto, user.sub);
  }

  // DELETE /links/:id
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.linksService.delete(id, user.sub);
  }
}
