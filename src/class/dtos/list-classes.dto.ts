import { IsOptional, IsString } from 'class-validator';

export class ListClassesQuery {
  @IsOptional()
  @IsString()
  discipline?: string;

  @IsOptional()
  @IsString()
  locationName?: string;
}
