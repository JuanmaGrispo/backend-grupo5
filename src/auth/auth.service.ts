import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import { UserOtp } from './user-otp.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

type OtpMode = 'login' | 'register' | 'auto';

@Injectable()
export class AuthService {
  private readonly ttlMinutes = 10;
  private readonly maxAttempts = 5;

  constructor(
    private readonly jwt: JwtService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    @InjectRepository(UserOtp) private readonly otpRepo: Repository<UserOtp>,
  ) { }

  private normalizeEmail(e: string) {
    return (e || '').trim().toLowerCase();
  }

  private generateOtp(length = 6): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  // start OTP: 'login' (exige que exista), 'register' (crea si no existe), 'auto' (default: crea si no existe)
  async startOtp(emailRaw: string, mode: OtpMode = 'auto') {
    const email = this.normalizeEmail(emailRaw);
    if (!email) throw new BadRequestException('Email requerido');

    let user = await this.userService.getUserByEmail(email);

    if (mode === 'login' && !user) throw new NotFoundException('Usuario no encontrado');
    if ((mode === 'register' || mode === 'auto') && !user) {
      user = await this.userService.createUser({ email }); // create minimal
    }

    // Evitar re-enviar si ya hay un OTP vigente
    const existing = await this.otpRepo.findOne({
      where: { email, used: false },
      order: { createdAt: 'DESC' },
    });
    if (existing && existing.expiresAt > new Date()) {
      throw new BadRequestException({
        code: 'OTP_ALREADY_SENT',
        message: 'Ya se envió un OTP vigente. Revisá tu correo.',
      });
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
        user: { id: user!.id } as any
      }),
    );

    await this.emailService.sendOtp(email, code, this.ttlMinutes);
    return { success: true };
  }

  async verifyOtp(emailRaw: string, code: string) {
    const email = this.normalizeEmail(emailRaw);
    if (!email || !code) throw new BadRequestException('Email y código requeridos');

    const otp = await this.otpRepo.findOne({
      where: { email, used: false },
      order: { createdAt: 'DESC' },
    });
    if (!otp) {
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'No hay OTP activo' });
    }

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
