import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateRatingDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La calificación debe ser al menos 1' })
  @Max(5, { message: 'La calificación no puede ser mayor a 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'El comentario no puede exceder 1000 caracteres' })
  comment?: string;
}
