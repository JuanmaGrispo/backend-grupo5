// src/auth/dtos/login-request.dto.ts
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  email: string;

  // 'password' | 'otp' (default: 'password')
  @IsOptional()
  @IsIn(['password', 'otp'])
  mode?: 'password' | 'otp' = 'password';

  // requerido sólo cuando mode === 'password'
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
