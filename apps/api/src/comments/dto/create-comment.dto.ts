import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';
import { EntityType } from '@prisma/client';

export class CreateCommentDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsUUID()
  entityId: string;

  @IsObject()
  @IsNotEmpty()
  body: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
