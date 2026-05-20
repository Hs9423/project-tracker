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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@project-tracker/shared';
import { TimeLogsService } from './time-logs.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { UpdateTimeLogDto } from './dto/update-time-log.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  // POST /tasks/:id/time-logs
  @Post('tasks/:id/time-logs')
  create(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTimeLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.timeLogsService.create(taskId, dto, user.sub);
  }

  // GET /tasks/:id/time-logs
  @Get('tasks/:id/time-logs')
  listForTask(@Param('id', ParseUUIDPipe) taskId: string, @CurrentUser() user: JwtPayload) {
    return this.timeLogsService.listForTask(taskId, user.sub);
  }

  // PATCH /time-logs/:id
  @Patch('time-logs/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.timeLogsService.update(id, dto, user.sub);
  }

  // DELETE /time-logs/:id
  @Delete('time-logs/:id')
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.timeLogsService.delete(id, user.sub);
  }

  // GET /users/me/timesheet?week=2026-W25
  @Get('users/me/timesheet')
  getMyTimesheet(@CurrentUser() user: JwtPayload, @Query('week') week: string) {
    return this.timeLogsService.getMyTimesheet(user.sub, week);
  }
}
