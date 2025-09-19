// src/classes/class.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThan } from 'typeorm';
import { ClassEntity } from './class.entity';
import { ClassSession } from './class-session.entity';
import { SessionContext } from './state/session-context';
import { UpdateData } from './state/session-state';
import { ClassSessionStatus } from './class-session.entity';

// DTOs (ajustá paths a los tuyos si difieren)
import { CreateClassDto } from './dtos/create-class.dto';
import { UpdateClassDto } from './dtos/update-class.dto';
import { ScheduleSessionDto } from './dtos/schedule-session.dto';
import { ListSessionsQuery } from './dtos/list-sessions.dto';
import { UpdateSessionDto } from './dtos/update-session.dto';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassEntity) private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(ClassSession) private readonly sessionRepo: Repository<ClassSession>,
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
    });

    return this.sessionRepo.save(session);
  }


async updateSession(sessionId: string, dto: UpdateSessionDto): Promise<ClassSession> {
  const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
  if (!s) throw new NotFoundException('Sesión no encontrada');

  // 👇 Map explícito DTO -> UpdateData (Date en startAt)
  const patch: UpdateData = {};
  if (dto.startAt) patch.startAt = new Date(dto.startAt);
  if (dto.durationMin !== undefined) patch.durationMin = dto.durationMin;
  if (dto.capacity !== undefined) patch.capacity = dto.capacity;

  const ctx = new SessionContext(s, {}, new Date());
  await ctx.update(patch);
  return this.sessionRepo.save(ctx.getAggregate());
}

  async cancelSession(sessionId: string, reason?: string): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Sesión no encontrada');

    const ctx = new SessionContext(s, /* { reservations: tuAdapter } */ {}, new Date());
    await ctx.cancel(reason);
    return this.sessionRepo.save(ctx.getAggregate());
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
      relations: { classRef: true },
    });
    if (!s) throw new NotFoundException('Sesión no encontrada');
    return s;
  }

  async listSessions(q: ListSessionsQuery) {
    const where: any = {};
    if (q.classId) where.classRef = { id: q.classId };
    if (q.discipline) where['classRef'] = { ...(where.classRef ?? {}), discipline: q.discipline };
    if (q.locationName) where['classRef'] = { ...(where.classRef ?? {}), locationName: q.locationName };

    if (q.from && q.to) where.startAt = Between(new Date(q.from), new Date(q.to));
    else if (q.from) where.startAt = MoreThanOrEqual(new Date(q.from));
    else if (q.to) where.startAt = LessThan(new Date(q.to));

    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize ?? 20)));

    const [items, total] = await this.sessionRepo.findAndCount({
      where,
      relations: { classRef: true },
      order: { startAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
