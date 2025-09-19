import { BadRequestException } from '@nestjs/common';
import { ClassSession, ClassSessionStatus } from '../../class-session.entity';
import { ISessionState, UpdateData } from '../session-state';
import { ReservationsPort } from '../session-context';

export class ScheduledState implements ISessionState {
  name = 'SCHEDULED';

  constructor(
    private session: ClassSession,
    private deps?: { reservations?: ReservationsPort },
    private now: Date = new Date(),
  ) {}

  async update(data: UpdateData): Promise<void> {
    if (data.startAt && new Date(data.startAt) < this.now) {
      throw new BadRequestException('No podés mover la sesión al pasado');
    }
    if (data.durationMin !== undefined && data.durationMin < 10) {
      throw new BadRequestException('durationMin debe ser >= 10');
    }
    if (data.capacity !== undefined && data.capacity < 1) {
      throw new BadRequestException('capacity debe ser >= 1');
    }
    Object.assign(this.session, data);
  }

  async cancel(reason?: string): Promise<void> {
    this.session.status = ClassSessionStatus.CANCELED;
    if (this.deps?.reservations) {
      await this.deps.reservations.cancelAllBySession(this.session.id, reason || 'Class canceled');
    }
  }

  getAggregate() {
    return this.session;
  }
}
