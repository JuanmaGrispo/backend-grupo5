import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListSessionsQuery {
  // Filtros
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsString()
  discipline?: string; // proviene de ClassEntity (se filtra por relation)

  @IsOptional()
  @IsString()
  locationName?: string; // idem

  @IsOptional()
  @IsDateString()
  from?: string; // ISO inclusive

  @IsOptional()
  @IsDateString()
  to?: string;   // ISO exclusive

  // Paginación simple
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number; // default 1 (service)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number; // default 20 (service)
}
