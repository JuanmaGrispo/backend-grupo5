// src/auth/auth.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dtos/login-request.dto';
import { LoginVerifyDto } from './dtos/login-verify.dto';
import { LoginPasswordDto } from './dtos/login-password.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Check login options for user
  @Public()
  @Get('login-options')
  @HttpCode(HttpStatus.OK)
  async getLoginOptions(@Query('email') email: string) {
    const options = await this.auth.checkUserPasswordStatus(email);
    return { success: true, ...options };
  }

  // Password-based login
  @Public()
  @Post('login/password')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() dto: LoginPasswordDto) {
    const result = await this.auth.loginWithPassword(dto.email, dto.password);
    return { success: true, message: 'Login exitoso', ...result };
  }

  // Registro explícito
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async startRegister(@Body() dto: LoginRequestDto) {
    await this.auth.startOtp(dto.email, 'register'); // 👈 acá va 'register'
    return { success: true, message: 'OTP enviado para registro' };
  }

  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  async verifyRegister(@Body() dto: LoginVerifyDto) {
    const result = await this.auth.verifyOtp(dto.email, dto.code);
    return { success: true, message: 'Registro exitoso', ...result };
  }

  // Login explícito (OTP)
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async startLogin(@Body() dto: LoginRequestDto) {
    await this.auth.startOtp(dto.email, 'login'); // 👈 acá va 'login'
    return { success: true, message: 'OTP enviado para login' };
  }

  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  async verifyLogin(@Body() dto: LoginVerifyDto) {
    const result = await this.auth.verifyOtp(dto.email, dto.code);
    return { success: true, message: 'Login exitoso', ...result };
  }
}
