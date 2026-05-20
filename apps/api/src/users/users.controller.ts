import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@project-tracker/shared';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  updateMe(@Body() dto: { name?: string; avatarUrl?: string }, @CurrentUser() user: JwtPayload) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Get('me/preferences')
  getPreferences(@CurrentUser() user: JwtPayload) {
    return this.usersService.getPreferences(user.sub);
  }

  @Patch('me/preferences')
  updatePreferences(
    @Body() dto: { emailNotifications?: boolean; notificationDigest?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updatePreferences(user.sub, dto);
  }

  @Get('me/team')
  getTeam(@CurrentUser() user: JwtPayload) {
    return this.usersService.getTeam(user.sub);
  }

  @Get('me/timesheet')
  getTimesheet(@Query('week') week: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.usersService.getTimesheet(user.sub, week);
  }

  @Get(':id/projects')
  getProjectsForUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProjectsForUser(id);
  }
}
