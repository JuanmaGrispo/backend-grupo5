import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSessionDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  durationMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}
