import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DependencyType } from '@prisma/client';

export class CreateDependencyDto {
  @IsUUID()
  dependsOnTaskId: string;

  @IsEnum(DependencyType)
  @IsOptional()
  type?: DependencyType;
}
