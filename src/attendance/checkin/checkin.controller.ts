// src/attendance/checkin.controller.ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from '../attendance.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly attendanceSvc: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('qr')
  async checkinQr(@Body('sessionId') sessionId: string, @Req() req) {
    const user = req.user; // viene del token JWT
    const att = await this.attendanceSvc.checkin(user, sessionId);
    return { success: true, attendance: att };
  }
}
