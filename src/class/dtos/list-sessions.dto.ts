// sessions.controller.ts (o donde tengas el endpoint)
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSessionsQuery {
  // FILTROS
  @IsOptional()
  @IsUUID()
  branchId?: string;        // sede

  @IsOptional()
  @IsUUID()
  classRefId?: string;      // disciplina (referencia a Class)

  @IsOptional()
  @IsString()
  status?: string;          // SCHEDULED/CANCELED/etc

  // Fecha: día (UTC) - formato YYYY-MM-DD
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'day must be in format YYYY-MM-DD',
  })
  day?: string;

  // Rango de fechas: desde (UTC) - formato YYYY-MM-DD
  @IsOptional()
  @IsDateString()
  from?: string;

  // Rango de fechas: hasta (UTC) - formato YYYY-MM-DD
  @IsOptional()
  @IsDateString()
  to?: string;

  // Paginación
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;            // default 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;        // default 20
}
