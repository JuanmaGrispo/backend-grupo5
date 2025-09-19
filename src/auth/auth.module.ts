import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { EmailModule } from 'src/email/email.module';
import { UserOtp } from './user-otp.entity'; // podés importar solo esta entity aquí
import { JwtStrategy } from './jwt.strategy';
import { GlobalAuthGuard } from './global-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule, // ya es global, pero no molesta
    UserModule,
    EmailModule,

    // Repos/Entities que este módulo necesita
    TypeOrmModule.forFeature([UserOtp]),

    // JWT con secret desde .env de forma segura
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-only-secret'), // fallback solo dev
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, { provide: APP_GUARD, useClass: GlobalAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
