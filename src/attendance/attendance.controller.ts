import { Controller, Get, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller()
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Get('me/attendance')
  myAttendance(@Req() req: any) {
    const userId = req.user.sub;
    return this.svc.myHistory(userId);
  }
}
