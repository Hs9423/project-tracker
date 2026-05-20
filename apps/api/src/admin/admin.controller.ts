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
import { Role } from '@project-tracker/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeParentDto } from './dto/change-parent.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { JwtPayload } from '@project-tracker/shared';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/users
  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  // POST /admin/users
  @Post('users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.adminService.createUser(dto, user.sub);
  }

  // PATCH /admin/users/:id
  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateUser(id, dto, user.sub);
  }

  // PATCH /admin/users/:id/parent
  @Patch('users/:id/parent')
  changeParent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeParentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.changeParent(id, dto, user.sub);
  }

  // DELETE /admin/users/:id
  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.adminService.deleteUser(id, user.sub);
  }

  // GET /admin/org-chart
  @Get('org-chart')
  getOrgChart() {
    return this.adminService.getOrgChart();
  }

  // GET /admin/audit-logs
  @Get('audit-logs')
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}
