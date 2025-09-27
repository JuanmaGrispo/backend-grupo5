// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from 'src/user/user.service';
import { UserOtp } from './user-otp.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from 'src/email/email.service'; // 👈 vuelve

type OtpMode = 'login' | 'register' | 'auto';

@Injectable()
export class AuthService {
  private readonly ttlMinutes = 10;
  private readonly maxAttempts = 5;

  constructor(
    private readonly jwt: JwtService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,         // 👈 vuelve
    @InjectRepository(UserOtp) private readonly otpRepo: Repository<UserOtp>,
  ) {}

  private normalizeEmail(e: string) {
    return (e || '').trim().toLowerCase();
  }

  private generateOtp(length = 6): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  // ===== LOGIN con password =====
  async loginPassword(emailRaw: string, password: string) {
    const email = this.normalizeEmail(emailRaw);
    if (!email || !password) throw new BadRequestException('Email y password requeridos');

    const user = await this.userService.getUserForAuth(email); // trae passwordHash
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.passwordHash) throw new UnauthorizedException('Usuario sin password configurado');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: process.env.JWT_EXPIRES || '7d',
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: (user as any).name ?? null },
    };
  }

  // ===== Inicio de OTP (login/register/auto) =====
  async startOtp(emailRaw: string, mode: OtpMode = 'auto', plainPassword?: string) {
    const email = this.normalizeEmail(emailRaw);
    if (!email) throw new BadRequestException('Email requerido');

    let user = await this.userService.getUserByEmail(email);

    if (mode === 'login' && !user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if ((mode === 'register' || mode === 'auto') && !user) {
      if (!plainPassword) throw new BadRequestException('Se requiere contraseña en el registro');
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      user = await this.userService.createUser({ email, passwordHash });
    }

    // Si ya hay un OTP vigente, en lugar de tirar error podés reutilizarlo (opcional)
    const existing = await this.otpRepo.findOne({
      where: { email, used: false },
      order: { createdAt: 'DESC' },
    });
    if (existing && existing.expiresAt > new Date()) {
      // Enviar de nuevo la notificación del mismo código NO es posible (no lo tenemos en claro).
      // Mejor generar uno nuevo y marcar el anterior como usado para evitar confusión:
      await this.otpRepo.update(existing.id, { used: true });
    }

    const code = this.generateOtp(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);

    await this.otpRepo.save(
      this.otpRepo.create({
        email,
        codeHash,
        expiresAt,
        used: false,
        attempts: 0,
        user: { id: user!.id } as any,
      }),
    );

    // 👇 Enviar por email
    await this.emailService.sendOtp(email, code, this.ttlMinutes);

    // 👇 En DEV podés retornar el código para pruebas rápidas
    const devEcho =
      process.env.NODE_ENV !== 'production' && process.env.AUTH_OTP_ECHO === '1'
        ? { devOtp: code }
        : {};

    return { success: true, channel: 'email', ...devEcho };
  }

  async startOtpLogin(emailRaw: string) {
    return this.startOtp(emailRaw, 'login');
  }

  // ===== Verificación de OTP (paso 2) =====
  async verifyOtp(emailRaw: string, code: string) {
    const email = this.normalizeEmail(emailRaw);
    if (!email || !code) throw new BadRequestException('Email y código requeridos');

    const otp = await this.otpRepo.findOne({
      where: { email, used: false },
      order: { createdAt: 'DESC' },
    });
    if (!otp) throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'No hay OTP activo' });
    if (otp.expiresAt <= new Date()) {
      throw new UnauthorizedException({ code: 'OTP_EXPIRED', message: 'El OTP venció' });
    }
    if (otp.attempts >= this.maxAttempts) {
      throw new UnauthorizedException({ code: 'OTP_LOCKED', message: 'Se alcanzó el límite de intentos' });
    }

    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      await this.otpRepo.increment({ id: otp.id }, 'attempts', 1);
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'Código incorrecto' });
    }

    await this.otpRepo.update(otp.id, { used: true });

    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: process.env.JWT_EXPIRES || '7d',
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: (user as any).name ?? null },
    };
  }
}
