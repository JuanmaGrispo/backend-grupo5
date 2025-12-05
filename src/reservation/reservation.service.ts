import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './reservation.entity';
import { ClassSession, ClassSessionStatus } from 'src/class/class-session.entity';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly data: DataSource,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
  ) {}

  async create(userId: string, sessionId: string) {
    return this.data.transaction(async (tx) => {
      const sessions = tx.getRepository(ClassSession);
      const reservations = tx.getRepository(Reservation);

      const s = await sessions.findOne({ 
        where: { id: sessionId },
        relations: ['classRef', 'branch'],
      });
      if (!s) throw new NotFoundException('Sesión no encontrada');
      if (s.status !== ClassSessionStatus.SCHEDULED) throw new BadRequestException('Sesión no reservable');
      if (s.startAt <= new Date()) throw new BadRequestException('Sesión pasada');

      // Verificar si el usuario ya tiene una reserva confirmada en esta sesión
      const existingReservation = await reservations.findOne({
        where: { 
          user: { id: userId }, 
          session: { id: sessionId }, 
          status: ReservationStatus.CONFIRMED 
        },
        relations: ['session', 'session.classRef'],
      });
      
      if (existingReservation) {
        const className = existingReservation.session?.classRef?.title || 'esta clase';
        const sessionDate = existingReservation.session?.startAt 
          ? new Intl.DateTimeFormat('es-AR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(existingReservation.session.startAt))
          : 'esta sesión';
        
        throw new BadRequestException(
          `Ya estás inscrito en ${className} para el ${sessionDate}. No puedes reservar la misma sesión dos veces.`
        );
      }

      if (s.reservedCount >= s.capacity) throw new BadRequestException('Sin cupo');

      const res = reservations.create({
        user: { id: userId } as any,
        session: { id: sessionId } as any,
        status: ReservationStatus.CONFIRMED,
      });
      await reservations.save(res);
      await sessions.increment({ id: sessionId }, 'reservedCount', 1);
      
      // Recargar la reserva con las relaciones para devolver el nombre de la clase
      const savedRes = await reservations.findOne({
        where: { id: res.id },
        relations: ['session', 'session.classRef', 'session.branch'],
      });
      
      if (!savedRes) {
        throw new NotFoundException('Error al crear la reserva');
      }
      
      return {
        ...savedRes,
        className: savedRes.session?.classRef?.title || null,
      };
    });
  }

  async cancelMine(userId: string, sessionId: string) {
    return this.data.transaction(async (tx) => {
      const reservations = tx.getRepository(Reservation);
      const resv = await reservations.findOne({
        where: { user: { id: userId }, session: { id: sessionId }, status: ReservationStatus.CONFIRMED },
        relations: ['session', 'session.classRef', 'session.branch'],
      });
      if (!resv) throw new NotFoundException('Reserva activa no encontrada');

      resv.status = ReservationStatus.CANCELED;
      resv.canceledAt = new Date();
      await reservations.save(resv);
      await tx.getRepository(ClassSession).decrement({ id: sessionId }, 'reservedCount', 1);
      
      return {
        ...resv,
        className: resv.session?.classRef?.title || null,
      };
    });
  }

async getMine(userId: string) {
  const reservations = await this.resRepo.find({
    where: { user: { id: userId } },
    relations: ['session', 'session.classRef', 'session.branch'],
    order: { createdAt: 'DESC' },
  });
  
  // Transformar para incluir el nombre de la clase de forma más accesible
  return reservations.map(reservation => ({
    ...reservation,
    className: reservation.session?.classRef?.title || null,
  }));
}

  /**
   * Cancela todas las reservas confirmadas de una sesión
   * Se usa cuando se cancela la sesión
   */
  async cancelAllBySession(sessionId: string, reason?: string): Promise<void> {
    this.logger.log(`Canceling all reservations for session ${sessionId}. Reason: ${reason || 'No reason provided'}`);
    
    await this.data.transaction(async (tx) => {
      const reservations = tx.getRepository(Reservation);
      const sessions = tx.getRepository(ClassSession);

      const resvs = await reservations.find({
        where: {
          session: { id: sessionId },
          status: ReservationStatus.CONFIRMED,
        },
      });

      this.logger.debug(`Found ${resvs.length} confirmed reservations to cancel for session ${sessionId}`);

      if (resvs.length === 0) {
        this.logger.debug(`No confirmed reservations found for session ${sessionId}`);
        return;
      }

      for (const resv of resvs) {
        resv.status = ReservationStatus.CANCELED;
        resv.canceledAt = new Date();
      }

      await reservations.save(resvs);
      await sessions.decrement({ id: sessionId }, 'reservedCount', resvs.length);
      
      this.logger.log(`Successfully canceled ${resvs.length} reservations for session ${sessionId}`);
    });
  }

  /**
   * Actualiza todas las reservas de una sesión cuando se reprograma
   * Actualiza el updatedAt para reflejar el cambio
   */
  async updateAllBySession(sessionId: string): Promise<void> {
    await this.data.transaction(async (tx) => {
      const reservations = tx.getRepository(Reservation);

      const resvs = await reservations.find({
        where: {
          session: { id: sessionId },
        },
      });

      if (resvs.length === 0) return;

      // Guardar las reservas para actualizar el updatedAt automáticamente
      await reservations.save(resvs);
    });
  }
}
