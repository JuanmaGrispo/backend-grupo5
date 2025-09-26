import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
