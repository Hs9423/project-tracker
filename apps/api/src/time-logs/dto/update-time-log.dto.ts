import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTimeLogDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(24)
  @Type(() => Number)
  @IsOptional()
  hours?: number;

  @IsString()
  @IsOptional()
  note?: string;
}
