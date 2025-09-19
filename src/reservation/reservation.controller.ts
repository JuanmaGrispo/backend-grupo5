// src/reservations/reservations.controller.ts
import { Controller, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { ReservationService } from './reservation.service';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly svc: ReservationService) {}

  @Post()
  create(@Body('sessionId') sessionId: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.svc.create(userId, sessionId);
  }

  @Patch(':sessionId/cancel')
  cancelMine(@Param('sessionId') sessionId: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.svc.cancelMine(userId, sessionId);
  }
}
