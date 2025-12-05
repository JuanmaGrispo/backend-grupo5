import { BadRequestException, Logger } from '@nestjs/common';
import { ClassSession, ClassSessionStatus } from '../../class-session.entity';
import { ISessionState, UpdateData } from '../session-state';
import { ReservationsPort } from '../session-context';

export class ScheduledState implements ISessionState {
  name = 'SCHEDULED';
  private readonly logger = new Logger(ScheduledState.name);

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
    this.logger.log(`Canceling scheduled session ${this.session.id}. Reason: ${reason || 'No reason provided'}`);
    this.session.status = ClassSessionStatus.CANCELED;
    if (this.deps?.reservations) {
      this.logger.debug(`Calling cancelAllBySession for session ${this.session.id}`);
      await this.deps.reservations.cancelAllBySession(this.session.id, reason || 'Class canceled');
      this.logger.debug(`cancelAllBySession completed for session ${this.session.id}`);
    } else {
      this.logger.warn(`No reservations port available for session ${this.session.id}. Reservations will not be canceled.`);
    }
  }

  getAggregate() {
    return this.session;
  }
}
