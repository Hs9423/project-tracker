import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@project-tracker/shared';
import { ReportsService } from './reports.service';
import { TeamProductivityQueryDto } from './dto/team-productivity-query.dto';
import { TimeTrackingQueryDto } from './dto/time-tracking-query.dto';
import { WorkloadQueryDto } from './dto/workload-query.dto';
import { ExportReportDto } from './dto/export-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project/:id')
  getProjectReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.getProjectReport(id);
  }

  @Get('team-productivity')
  getTeamProductivity(
    @Query() query: TeamProductivityQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getTeamProductivity(user.sub, query);
  }

  @Get('time-tracking')
  getTimeTracking(
    @Query() query: TimeTrackingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getTimeTracking(user.sub, query);
  }

  @Get('workload')
  getWorkload(
    @Query() query: WorkloadQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getWorkload(user.sub, query);
  }

  @Post('export')
  queueExport(@Body() dto: ExportReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.queueExport(dto, user.sub);
  }

  @Get('export/:jobId')
  getExportStatus(@Param('jobId') jobId: string) {
    return this.reportsService.getExportStatus(jobId);
  }

  @Get('export/:jobId/download')
  async downloadExport(@Param('jobId') jobId: string, @Res() res: Response) {
    const exportsDir = path.join(process.cwd(), 'exports');
    const files = fs.existsSync(exportsDir) ? fs.readdirSync(exportsDir) : [];
    const file = files.find(f => f.startsWith(jobId));
    if (!file) {
      res.status(404).json({ message: 'Export not found or not ready' });
      return;
    }
    const filePath = path.join(exportsDir, file);
    const ext = path.extname(file).slice(1);
    const contentType = ext === 'pdf' ? 'application/pdf' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="report_${jobId}.${ext}"`);
    fs.createReadStream(filePath).pipe(res);
  }
}
