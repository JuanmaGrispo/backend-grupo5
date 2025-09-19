import { ClassSession } from '../class-session.entity';

export type UpdateData = Partial<Pick<
  ClassSession,
  'startAt' | 'durationMin' | 'capacity'
>>;

export interface ISessionState {
  name: string;

  update(data: UpdateData): Promise<void>;

  cancel(reason?: string): Promise<void>;

  getAggregate(): ClassSession;
}
