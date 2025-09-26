// src/classes/class.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClassEntity } from './class.entity';
import { ClassSession, ClassSessionStatus } from './class-session.entity';
import { SessionContext } from './state/session-context';
import { UpdateData } from './state/session-state';

// DTOs (ajustá paths si difieren)
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
      // branch: ... (setealo si tu DTO lo trae)
    });

    return this.sessionRepo.save(session);
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto): Promise<ClassSession> {
    const s = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('Sesión no encontrada');

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

    const ctx = new SessionContext(s, /* adapters */ {}, new Date());
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

  qb.skip((page - 1) * pageSize).take(pageSize);

  const [items, total] = await qb.getManyAndCount();
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}
}
