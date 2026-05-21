import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@project-tracker/shared';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: JwtPayload) {
    return this.projectsService.create(dto, user.sub);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.list(user.sub, query);
  }

  @Get(':id')
  @UseGuards(ProjectAccessGuard)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(ProjectAccessGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(ProjectAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.delete(id);
  }

  @Get(':id/team')
  @UseGuards(ProjectAccessGuard)
  getTeam(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getTeam(id);
  }

  @Get(':id/gantt')
  @UseGuards(ProjectAccessGuard)
  getGantt(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getGantt(id);
  }

  @Get(':id/kanban')
  @UseGuards(ProjectAccessGuard)
  getKanban(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getKanban(id);
  }

  @Get(':id/workload')
  @UseGuards(ProjectAccessGuard)
  getWorkload(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getWorkload(id);
  }

  @Get(':id/time-report')
  @UseGuards(ProjectAccessGuard)
  getTimeReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getTimeReport(id);
  }

  @Get(':id/activity')
  @UseGuards(ProjectAccessGuard)
  getActivity(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getActivity(id);
  }
}
