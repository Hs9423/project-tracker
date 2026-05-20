import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@project-tracker/shared';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // POST /projects/:id/tasks — ProjectAccessGuard uses params.id as projectId
  @Post('projects/:id/tasks')
  @UseGuards(ProjectAccessGuard)
  createTask(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.createTask(projectId, dto, user.sub);
  }

  // GET /projects/:id/tasks
  @Get('projects/:id/tasks')
  @UseGuards(ProjectAccessGuard)
  listTasks(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.tasksService.listTasks(projectId);
  }

  // GET /tasks/mine — must come before tasks/:id
  @Get('tasks/mine')
  getMyTasks(@CurrentUser() user: JwtPayload) {
    return this.tasksService.getMyTasks(user.sub);
  }

  // GET /tasks/:id — access check done in service
  @Get('tasks/:id')
  getTask(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.getTaskById(id, user.sub);
  }

  // PATCH /tasks/:id
  @Patch('tasks/:id')
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.updateTask(id, dto, user.sub);
  }

  // DELETE /tasks/:id
  @Delete('tasks/:id')
  deleteTask(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.deleteTask(id, user.sub);
  }

  // POST /tasks/:id/subtasks
  @Post('tasks/:id/subtasks')
  createSubtask(
    @Param('id', ParseUUIDPipe) parentId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.createSubtask(parentId, dto, user.sub);
  }

  // POST /tasks/:id/dependencies
  @Post('tasks/:id/dependencies')
  createDependency(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateDependencyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.createDependency(taskId, dto, user.sub);
  }

  // GET /tasks/:id/activity
  @Get('tasks/:id/activity')
  getTaskActivity(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.getTaskActivity(id, user.sub);
  }

  // DELETE /tasks/:id/dependencies/:depId
  @Delete('tasks/:id/dependencies/:depId')
  deleteDependency(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Param('depId', ParseUUIDPipe) depId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.deleteDependency(taskId, depId, user.sub);
  }
}
