import { IsEmail, isEmail, Length } from "class-validator";

export class LoginVerifyDto {
  @IsEmail()
  email!: string;

  @Length(4, 10)
  code!: string;
}
