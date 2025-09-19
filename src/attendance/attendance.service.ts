// src/attendance/attendance.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { ClassSession, ClassSessionStatus } from '../class/class-session.entity';
import { User } from '../user/user.entity';
import { Reservation, ReservationStatus } from '../reservation/reservation.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Reservation) private readonly reservationRepo: Repository<Reservation>,
  ) { }

  async checkin(user: User, sessionId: string): Promise<Attendance> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    if (![ClassSessionStatus.SCHEDULED, ClassSessionStatus.IN_PROGRESS].includes(session.status)) {
      throw new BadRequestException('La sesión no admite check-in');
    }

    // Ventana horaria
    const now = new Date();
    const start = new Date(session.startAt);
    const before = new Date(start.getTime() - 15 * 60_000);
    const after = new Date(start.getTime() + 60 * 60_000);
    if (now < before || now > after) {
      throw new BadRequestException('Fuera de ventana de check-in');
    }

    const reservation = await this.reservationRepo.findOne({
      where: { user: { id: user.id }, session: { id: sessionId }, status: ReservationStatus.CONFIRMED },
    });
    if (!reservation) {
      throw new UnauthorizedException('No tenés una reserva confirmada para esta sesión');
    }

    const existing = await this.attendanceRepo.findOne({
      where: { user: { id: user.id }, session: { id: sessionId } },
    });
    if (existing) return existing;

    const att = this.attendanceRepo.create({ user, session });
    return this.attendanceRepo.save(att);
  }

  async myHistory(userId: string) {
    return this.attendanceRepo.find({
      where: { user: { id: userId } },
      relations: { session: { classRef: true } }, // incluye la clase de la sesión
      order: { createdAt: 'DESC' },               // si tu columna es checkInAt, usá { checkInAt: 'DESC' }
    });
  }
}
