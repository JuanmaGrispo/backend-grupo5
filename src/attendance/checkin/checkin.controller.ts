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
    
    // Retornar datos completos para confirmación en frontend
    return {
      success: true,
      attendance: {
        id: att.id,
        createdAt: att.createdAt,
        session: {
          id: att.session.id,
          startAt: att.session.startAt,
          endAt: att.session.endAt,
          status: att.session.status,
          class: {
            id: att.session.classRef.id,
            title: att.session.classRef.title,
            discipline: att.session.classRef.discipline,
            instructorName: att.session.classRef.instructorName,
          },
          branch: att.session.branch ? {
            id: att.session.branch.id,
            name: att.session.branch.name,
            location: att.session.branch.location,
          } : null,
        },
      },
    };
  }
}
