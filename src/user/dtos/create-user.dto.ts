import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
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

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100)
  passwordHash: string;
}

export class UpdateUserNameDto extends PickType(CreateUserDto, ['name'] as const) {}
