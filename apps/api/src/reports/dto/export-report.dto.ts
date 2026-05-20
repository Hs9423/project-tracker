import { IsEnum, IsIn, IsObject, IsOptional } from 'class-validator';

export type ReportType = 'project' | 'team-productivity' | 'time-tracking' | 'workload';
export type ExportFormat = 'pdf' | 'csv';

export class ExportReportDto {
  @IsIn(['project', 'team-productivity', 'time-tracking', 'workload'])
  type: ReportType;

  @IsIn(['pdf', 'csv'])
  format: ExportFormat;

  @IsOptional()
  @IsObject()
  filters?: Record<string, string>;
}
