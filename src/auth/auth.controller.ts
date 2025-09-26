// src/auth/auth.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dtos/login-request.dto';
import { LoginVerifyDto } from './dtos/login-verify.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ===== Register (siempre OTP) =====
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async startRegister(@Body() dto: LoginRequestDto) {
    // crea user si no existe y guarda passwordHash
    await this.auth.startOtp(dto.email, 'register', dto.password);
    return { success: true, message: 'OTP enviado para registro' };
  }

  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  async verifyRegister(@Body() dto: LoginVerifyDto) {
    const result = await this.auth.verifyOtp(dto.email, dto.code);
    return { success: true, message: 'Registro exitoso', ...result };
  }

  // ===== Login híbrido (password u otp según mode) =====
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequestDto) {
    const mode = dto.mode ?? 'password';

    if (mode === 'password') {
      const { accessToken, user } = await this.auth.loginPassword(dto.email, dto.password!);
      return { accessToken, user, mode: 'password' };
    }

    // mode === 'otp'
    await this.auth.startOtpLogin(dto.email);
    return { success: true, message: 'OTP enviado', mode: 'otp' };
  }

  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  async verifyLogin(@Body() dto: LoginVerifyDto) {
    const { accessToken, user } = await this.auth.verifyOtp(dto.email, dto.code);
    return { success: true, message: 'Login exitoso', accessToken, user };
  }
}
