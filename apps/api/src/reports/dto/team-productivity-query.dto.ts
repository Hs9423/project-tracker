import { IsDateString, IsOptional } from 'class-validator';

export class TeamProductivityQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
