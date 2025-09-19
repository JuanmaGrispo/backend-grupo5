import { BadRequestException } from '@nestjs/common';
import { ClassSession } from '../../class-session.entity';
import { ISessionState, UpdateData } from '../session-state';

export class CanceledState implements ISessionState {
  name = 'CANCELED';

  constructor(private session: ClassSession) {}

  async update(_data: UpdateData): Promise<void> {
    throw new BadRequestException('La sesión cancelada no admite actualizaciones');
  }

  async cancel(_reason?: string): Promise<void> {
    return;
  }

  getAggregate() {
    return this.session;
  }
}
