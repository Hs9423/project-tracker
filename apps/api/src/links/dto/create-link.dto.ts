import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { EntityType } from '@prisma/client';

export class CreateLinkDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsUUID()
  entityId: string;

  @IsUrl()
  url: string;

  @IsString()
  @IsOptional()
  label?: string;
}
