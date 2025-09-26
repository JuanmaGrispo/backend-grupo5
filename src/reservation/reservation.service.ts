import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './reservation.entity';
import { ClassSession, ClassSessionStatus } from 'src/class/class-session.entity';

@Injectable()
export class ReservationService {
  constructor(
    private readonly data: DataSource,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
  ) {}

  async create(userId: string, sessionId: string) {
    return this.data.transaction(async (tx) => {
      const sessions = tx.getRepository(ClassSession);
      const reservations = tx.getRepository(Reservation);

      const s = await sessions.findOne({ where: { id: sessionId } });
      if (!s) throw new NotFoundException('Sesión no encontrada');
      if (s.status !== ClassSessionStatus.SCHEDULED) throw new BadRequestException('Sesión no reservable');
      if (s.startAt <= new Date()) throw new BadRequestException('Sesión pasada');

      const dup = await reservations.findOne({
        where: { user: { id: userId }, session: { id: sessionId }, status: ReservationStatus.CONFIRMED },
      });
      if (dup) throw new BadRequestException('Ya tenés reserva confirmada');

      if (s.reservedCount >= s.capacity) throw new BadRequestException('Sin cupo');

      const res = reservations.create({
        user: { id: userId } as any,
        session: { id: sessionId } as any,
        status: ReservationStatus.CONFIRMED,
      });
      await reservations.save(res);
      await sessions.increment({ id: sessionId }, 'reservedCount', 1);
      return res;
    });
  }

  async cancelMine(userId: string, sessionId: string) {
    return this.data.transaction(async (tx) => {
      const reservations = tx.getRepository(Reservation);
      const resv = await reservations.findOne({
        where: { user: { id: userId }, session: { id: sessionId }, status: ReservationStatus.CONFIRMED },
      });
      if (!resv) throw new NotFoundException('Reserva activa no encontrada');

      resv.status = ReservationStatus.CANCELED;
      resv.canceledAt = new Date();
      await reservations.save(resv);
      await tx.getRepository(ClassSession).decrement({ id: sessionId }, 'reservedCount', 1);
      return resv;
    });
  }

async getMine(userId: string) {
  return this.resRepo.find({
    where: { user: { id: userId } },
    relations: ['session'],
    order: { createdAt: 'DESC' },
  });
}
}
