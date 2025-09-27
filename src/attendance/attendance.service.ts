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
  ) {}

  async checkin(user: any, sessionId: string): Promise<Attendance> {
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

    // Get the actual user ID from JWT payload (it's in 'sub' field)
    const userId = user.sub || user.id;
    const reservation = await this.reservationRepo.findOne({
      where: { user: { id: userId }, session: { id: sessionId }, status: ReservationStatus.CONFIRMED },
    });
    if (!reservation) {
      throw new UnauthorizedException('No tenés una reserva confirmada para esta sesión');
    }

    const existing = await this.attendanceRepo.findOne({
      where: { user: { id: userId }, session: { id: sessionId } },
    });
    if (existing) return existing;
    
    // Debug logging
    console.log('=== CREATING ATTENDANCE ===');
    console.log('User ID from JWT sub:', userId);
    console.log('Session ID:', session.id);
    console.log('User object:', user);
    console.log('Session object:', session);

    try {
      const att = this.attendanceRepo.create({ 
        user: { id: userId } as any, 
        session: { id: session.id } as any 
      });
      console.log('Created attendance object:', att);
      
      const saved = await this.attendanceRepo.save(att);
      console.log('Saved attendance:', saved);
      return saved;
    } catch (error) {
      console.error('Error saving attendance:', error);
      throw error;
    }
  }

  async myHistory(userId: string) {
    return this.attendanceRepo.find({
      where: { user: { id: userId } },
      relations: { session: { classRef: true } },
      order: { createdAt: 'DESC' },
    });
  }
}