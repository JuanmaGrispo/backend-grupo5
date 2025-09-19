import { BadRequestException } from '@nestjs/common';
import { ClassSession, ClassSessionStatus } from '../../class-session.entity';
import { ISessionState, UpdateData } from '../session-state';

export class InProgressState implements ISessionState {
  name = 'IN_PROGRESS';

  constructor(private session: ClassSession) {}

  async update(_data: UpdateData): Promise<void> {
    // Durante la clase no permitimos cambios estructurales
    throw new BadRequestException('No podés actualizar una sesión en curso');
  }

  async cancel(_reason?: string): Promise<void> {
    // Política: si ya empezó, no se puede cancelar
    throw new BadRequestException('No podés cancelar una sesión en curso');
  }

  getAggregate() {
    return this.session;
  }
}
