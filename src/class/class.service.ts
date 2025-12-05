// src/classes/class.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClassEntity } from './class.entity';
import { ClassSession, ClassSessionStatus } from './class-session.entity';
import { SessionContext } from './state/session-context';
import { UpdateData } from './state/session-state';
import { ReservationService } from '../reservation/reservation.service';
import { NotifierService } from '../notifier/notifier.service';

// DTOs (ajustá paths si difieren)
import { CreateClassDto } from './dtos/create-class.dto';
import { UpdateClassDto } from './dtos/update-class.dto';
import { ScheduleSessionDto } from './dtos/schedule-session.dto';
import { ListSessionsQuery } from './dtos/list-sessions.dto';
import { UpdateSessionDto } from './dtos/update-session.dto';

@Injectable()
export class ClassService {
  private readonly logger = new Logger(ClassService.name);

  constructor(
    @InjectRepository(ClassEntity) private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
    private readonly reservationService: ReservationService,
    @Inject(forwardRef(() => NotifierService))
    private readonly notifierService: NotifierService,
  ) {}

  // ---------- ABM de ClassEntity ----------

  async createClass(dto: CreateClassDto): Promise<ClassEntity> {
    const cls = this.classRepo.create({
      title: dto.title,
      description: dto.description,
      discipline: dto.discipline,
      defaultDurationMin: dto.defaultDurationMin ?? 60,
      defaultCapacity: dto.defaultCapacity ?? 20,
      instructorName: dto.instructorName,
      locationName: dto.locationName,
      locationAddress: dto.locationAddress,
    });
    return this.classRepo.save(cls);
  }

  async updateClass(id: string, dto: UpdateClassDto): Promise<ClassEntity> {
    const cls = await this.classRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Clase no encontrada');
    Object.assign(cls, dto);
    return this.classRepo.save(cls);
  }

  async deleteClass(id: string): Promise<void> {
    const res = await this.classRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Clase no encontrada');
  }

  async getClass(id: string): Promise<ClassEntity> {
    const cls = await this.classRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Clase no encontrada');
    return cls;
  }

  async listClasses(): Promise<ClassEntity[]> {
    return this.classRepo.find({ order: { createdAt: 'DESC' } });
  }

  // ---------- ABM + ciclo de vida de ClassSession ----------

  async scheduleSession(dto: ScheduleSessionDto): Promise<ClassSession> {
    const cls = await this.classRepo.findOne({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Clase no encontrada');

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException('startAt inválido');

    const durationMin = dto.durationMin ?? cls.defaultDurationMin ?? 60;
    const capacity = dto.capacity ?? cls.defaultCapacity ?? 20;

    const session = this.sessionRepo.create({
      classRef: { id: cls.id } as any,
      startAt,
      durationMin,
      capacity,
      status: ClassSessionStatus.SCHEDULED,
      reservedCount: 0,
      // branch: ... (setealo si tu DTO lo trae)
    });

    return this.sessionRepo.save(session);
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Sesión no encontrada');

    // Guardar la fecha anterior ANTES de actualizar
    const oldStartAt = s.startAt ? new Date(s.startAt) : null;
    const newStartAt = dto.startAt ? new Date(dto.startAt) : undefined;
    
    // Comparar las fechas correctamente (normalizar a milisegundos para evitar problemas de timezone)
    const wasRescheduled = newStartAt && oldStartAt && 
      Math.abs(newStartAt.getTime() - oldStartAt.getTime()) > 1000; // Más de 1 segundo de diferencia

    this.logger.debug(
      `Updating session ${sessionId}. Old startAt: ${oldStartAt?.toISOString()}, New startAt: ${newStartAt?.toISOString()}, Was rescheduled: ${wasRescheduled}`
    );

    const patch: UpdateData = {};
    if (dto.startAt && newStartAt) patch.startAt = newStartAt;
    if (dto.durationMin !== undefined) patch.durationMin = dto.durationMin;
    if (dto.capacity !== undefined) patch.capacity = dto.capacity;

    const ctx = new SessionContext(
      s,
      {
        reservations: {
          cancelAllBySession: (sessionId: string, reason?: string) =>
            this.reservationService.cancelAllBySession(sessionId, reason),
        },
      },
      new Date(),
    );
    await ctx.update(patch);
    const updatedSession = await this.sessionRepo.save(ctx.getAggregate());

    // Si se reprogramó la sesión, actualizar las reservas y crear notificaciones
    if (wasRescheduled && oldStartAt) {
      this.logger.log(`Session ${sessionId} was rescheduled. Updating reservations and sending notifications.`);
      // Actualizar todas las reservas de la sesión (actualiza el updatedAt)
      await this.reservationService.updateAllBySession(sessionId);
      // Crear notificaciones para todos los usuarios con reservas
      await this.notifierService.notifySessionRescheduled(sessionId, oldStartAt);
    }

    return updatedSession;
  }

  async cancelSession(sessionId: string, reason?: string): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Sesión no encontrada');

    this.logger.log(`Canceling session ${sessionId}. Reason: ${reason || 'No reason provided'}`);

    // IMPORTANTE: Buscar las reservas ANTES de cancelarlas para poder crear notificaciones
    await this.notifierService.notifySessionCanceled(sessionId, reason);

    const ctx = new SessionContext(
      s,
      {
        reservations: {
          cancelAllBySession: (sessionId: string, reason?: string) => {
            this.logger.debug(`Canceling all reservations for session ${sessionId}`);
            return this.reservationService.cancelAllBySession(sessionId, reason);
          },
        },
      },
      new Date(),
    );
    await ctx.cancel(reason);
    const canceledSession = await this.sessionRepo.save(ctx.getAggregate());

    this.logger.log(`Session ${sessionId} canceled successfully. Status: ${canceledSession.status}`);

    return canceledSession;
  }

  async startSession(sessionId: string): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Sesión no encontrada');

    const ctx = new SessionContext(s, {}, new Date());
    await ctx.start();
    return this.sessionRepo.save(ctx.getAggregate());
  }

  async completeSession(sessionId: string): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Sesión no encontrada');

    const ctx = new SessionContext(s, {}, new Date());
    await ctx.complete();
    return this.sessionRepo.save(ctx.getAggregate());
  }

  async deleteSession(sessionId: string): Promise<void> {
    const res = await this.sessionRepo.delete(sessionId);
    if (!res.affected) throw new NotFoundException('Sesión no encontrada');
  }

  async getSession(sessionId: string): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { classRef: true, branch: true },
    });
    if (!s) throw new NotFoundException('Sesión no encontrada');
    return s;
  }

  // ---------- Listado con filtros (sede, disciplina, fecha, estado) ----------
  // q: { branchId?, classRefId?, status?, day?, page?, pageSize? }
async listSessions(q: ListSessionsQuery) {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;

  const qb = this.sessionRepo
    .createQueryBuilder('s')
    .leftJoinAndSelect('s.classRef', 'c')
    .leftJoinAndSelect('s.branch', 'b')
    .orderBy('s.startAt', 'ASC'); // ← sin comillas

  // sede
  if (q.branchId) {
    qb.andWhere('b.id = :branchId', { branchId: q.branchId });
  }

  // disciplina / clase
  if (q.classRefId) {
    qb.andWhere('c.id = :classRefId', { classRefId: q.classRefId });
  }

  // estado
  if (q.status) {
    qb.andWhere('s.status = :status', { status: q.status });
  }

  // día UTC [00:00, 24:00)
  if (q.day) {
    const from = new Date(`${q.day}T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 1);
    qb.andWhere('s.startAt >= :from AND s.startAt < :to', { from, to });
  }

  // rango de fechas UTC
  if (q.from || q.to) {
    if (q.from) {
      const fromDate = new Date(`${q.from}T00:00:00.000Z`);
      qb.andWhere('s.startAt >= :fromDate', { fromDate });
    }
    if (q.to) {
      const toDate = new Date(`${q.to}T23:59:59.999Z`);
      qb.andWhere('s.startAt <= :toDate', { toDate });
    }
  }

  qb.skip((page - 1) * pageSize).take(pageSize);

  const [items, total] = await qb.getManyAndCount();
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}
}
