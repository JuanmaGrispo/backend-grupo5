import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
