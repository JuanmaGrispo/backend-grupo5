import { IsEmail, isEmail, IsString } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  email!: string

  @IsString()
  password!: string
}
