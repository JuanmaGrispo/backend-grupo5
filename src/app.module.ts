import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClassModule } from './class/class.module';
import { NotifierController } from './notifier/notifier.controller';
import { NotifierModule } from './notifier/notifier.module';
import { ReservationModule } from './reservation/reservation.module';
import { AttendanceModule } from './attendance/attendance.module';
import { QrModule } from './qr/qr.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Conexión a la DB usando variables de entorno (.env)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',                               // motor (postgres, mysql, etc.)
        host: cfg.get<string>('DB_HOST'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('DB_USER'),
        password: cfg.get<string>('DB_PASS'),
        database: cfg.get<string>('DB_NAME'),
        ssl: cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: true,     // <- habilitar en dev
        logging: true         // log de queries (útil en dev)
      }),
    }),

    // Acá "enchufás" tus módulos de negocio
    AuthModule,
    UserModule,
    EmailModule,
    ClassModule,
    NotifierModule,
    ReservationModule,
    AttendanceModule,
    QrModule,
  ],
  controllers: [AppController, NotifierController],
  providers: [AppService],
})
export class AppModule { }
