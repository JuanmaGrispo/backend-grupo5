import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotifierService } from './notifier.service';
import { NotifierController } from './notifier.controller';
import { Notification } from './notification.entity';
import { ClassSession } from '../class/class-session.entity';
import { Reservation } from '../reservation/reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, ClassSession, Reservation]),
  ],
  providers: [NotifierService],
  controllers: [NotifierController],
  exports: [NotifierService],
})
export class NotifierModule {}
