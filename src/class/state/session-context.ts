// src/classes/state/session-context.ts
import { BadRequestException } from '@nestjs/common';
import { ClassSession, ClassSessionStatus } from '../class-session.entity';
import { ISessionState, UpdateData } from './session-state';
import { ScheduledState } from './states/scheduled.state';
import { CanceledState } from './states/canceled.state';
import { InProgressState } from './states/in-progress.state';
import { CompletedState } from './states/completed.state';

export interface ReservationsPort {
  cancelAllBySession(sessionId: string, reason?: string): Promise<void>;
}

type Deps = {
  reservations?: ReservationsPort;
};

export class SessionContext {
  private state: ISessionState;

  constructor(
    private session: ClassSession,
    private deps: Deps = {},
    private now: Date = new Date(),
  ) {
    this.state = this.buildState();
  }

  private buildState(): ISessionState {
    switch (this.session.status) {
      case ClassSessionStatus.SCHEDULED:
        return new ScheduledState(this.session, this.deps, this.now);
      case ClassSessionStatus.IN_PROGRESS:
        return new InProgressState(this.session);
      case ClassSessionStatus.COMPLETED:
        return new CompletedState(this.session);
      case ClassSessionStatus.CANCELED:
        return new CanceledState(this.session);
      default:
        throw new BadRequestException(`Estado no soportado: ${this.session.status}`);
    }
  }

  async update(data: UpdateData) {
    await this.state.update(data);
    this.state = this.buildState();
  }

  async cancel(reason?: string) {
    await this.state.cancel(reason);
    this.state = this.buildState();
  }

  async start() {
    if (this.session.status !== ClassSessionStatus.SCHEDULED) {
      throw new BadRequestException('Solo se puede iniciar una sesión programada');
    }
    this.session.status = ClassSessionStatus.IN_PROGRESS;
    this.state = this.buildState();
  }

  async complete() {
    if (this.session.status !== ClassSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Solo se puede completar una sesión en curso');
    }
    this.session.status = ClassSessionStatus.COMPLETED;
    this.state = this.buildState();
  }

  getAggregate() {
    return this.state.getAggregate();
  }
}
