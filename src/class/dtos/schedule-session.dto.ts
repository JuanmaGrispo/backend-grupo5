import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ScheduleSessionDto {
  @IsUUID()
  classId: string;

  @IsDateString()
  startAt: string;

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
