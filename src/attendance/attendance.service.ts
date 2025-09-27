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

type Principal =
  | (User & { sub?: string; userId?: string })
  | { id?: string; sub?: string; userId?: string };

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
    @InjectRepository(Reservation) private readonly reservationRepo: Repository<Reservation>,
  ) {}

  private getUserId(principal: Principal): string | null {
    // acepta id, userId o sub (JWT)
    return (principal as any)?.id ?? (principal as any)?.userId ?? (principal as any)?.sub ?? null;
  }

  /**
   * Check-in del usuario autenticado a una sesión (sin validación de ventana horaria).
   * Requisitos:
   *  - Sesión SCHEDULED o IN_PROGRESS
   *  - Reserva CONFIRMED del usuario para esa sesión
   *  - Unicidad user+session
   */
  async checkin(principal: Principal, sessionId: string): Promise<Attendance> {
    const userId = this.getUserId(principal);
    if (!userId) throw new UnauthorizedException('Usuario no identificado');

    // 1) Sesión
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    // 2) Estado permitido
    if (![ClassSessionStatus.SCHEDULED, ClassSessionStatus.IN_PROGRESS].includes(session.status)) {
      throw new BadRequestException('La sesión no admite check-in');
    }

    // 3) Reserva confirmada
    const reservation = await this.reservationRepo.findOne({
      where: { user: { id: userId }, session: { id: sessionId }, status: ReservationStatus.CONFIRMED },
    });
    if (!reservation) {
      throw new UnauthorizedException('No tenés una reserva confirmada para esta sesión');
    }

    // 4) Evitar duplicados
    const existing = await this.attendanceRepo.findOne({
      where: { user: { id: userId }, session: { id: sessionId } },
    });
    if (existing) return existing;

    // 5) Crear attendance seteando FKs por id explícito
    const att = this.attendanceRepo.create({
      user: { id: userId } as User,
      session: { id: sessionId } as ClassSession,
    });
    return this.attendanceRepo.save(att);
  }

  async myHistory(userId: string) {
    return this.attendanceRepo.find({
      where: { user: { id: userId } },
      relations: { session: { classRef: true } },
      order: { createdAt: 'DESC' },
    });
  }
}
