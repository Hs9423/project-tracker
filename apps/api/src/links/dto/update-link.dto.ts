import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateLinkDto {
  @IsUrl()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  label?: string;
}
