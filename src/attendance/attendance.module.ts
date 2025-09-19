// src/attendance/attendance.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './attendance.entity';
import { AttendanceService } from './attendance.service';
import { CheckinController } from './checkin/checkin.controller';
import { ClassSession } from '../class/class-session.entity';
import { Reservation } from '../reservation/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, ClassSession, Reservation])],
  providers: [AttendanceService],
  controllers: [CheckinController],
})
export class AttendanceModule {}
