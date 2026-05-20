import { IsOptional, IsUUID } from 'class-validator';

export class ChangeParentDto {
  @IsUUID()
  @IsOptional()
  parentId?: string | null;
}
