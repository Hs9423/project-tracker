import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Priority, ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ListProjectsQueryDto {
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  tags?: string[];

  @IsIn(['dueDate', 'createdAt', 'title'])
  @IsOptional()
  sortBy?: 'dueDate' | 'createdAt' | 'title';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc';
}
