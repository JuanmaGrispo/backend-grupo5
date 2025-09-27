import { Controller, Get, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Get('me')
  myAttendance(@Req() req: any) {
    const userId = req.user.sub;
    return this.svc.myHistory(userId);
  }
}
