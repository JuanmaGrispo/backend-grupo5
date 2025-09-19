import { IsEmail, isEmail } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  email!: string
}
