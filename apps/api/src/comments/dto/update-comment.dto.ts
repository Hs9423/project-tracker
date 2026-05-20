import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateCommentDto {
  @IsObject()
  @IsNotEmpty()
  body: Record<string, unknown>;
}
