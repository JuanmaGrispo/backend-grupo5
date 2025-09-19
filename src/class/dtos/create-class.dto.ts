import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  discipline?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  defaultDurationMin?: number; // por defecto 60 (lo setea el service si no viene)

  @IsOptional()
  @IsInt()
  @IsPositive()
  defaultCapacity?: number; // por defecto 20

  @IsOptional()
  @IsString()
  instructorName?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  locationAddress?: string;
}
