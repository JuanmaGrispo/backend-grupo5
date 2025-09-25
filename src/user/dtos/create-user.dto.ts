import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { PickType } from '@nestjs/mapped-types';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}

export class UpdateUserNameDto extends PickType(CreateUserDto, ['name'] as const) {}