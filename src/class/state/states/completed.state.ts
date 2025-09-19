import { BadRequestException } from '@nestjs/common';
import { ClassSession } from '../../class-session.entity';
import { ISessionState, UpdateData } from '../session-state';

export class CompletedState implements ISessionState {
  name = 'COMPLETED';

  constructor(private session: ClassSession) {}

  async update(_data: UpdateData): Promise<void> {
    throw new BadRequestException('No podés actualizar una sesión completada');
  }

  async cancel(_reason?: string): Promise<void> {
    throw new BadRequestException('No podés cancelar una sesión completada');
  }

  getAggregate() {
    return this.session;
  }
}
