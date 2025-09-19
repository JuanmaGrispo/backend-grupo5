import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClassEntity } from './class.entity';

export enum ClassSessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

@Entity('class_sessions')
@Check(`"durationMin" >= 10`)
@Check(`"capacity" >= 1`)
@Index('idx_session_class_start', ['classRef', 'startAt'])
@Index('idx_session_status', ['status'])
export class ClassSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 👇 Normalizado: solo FK; sin eager para no duplicar/arrastrar datos
  @ManyToOne(() => ClassEntity, (c) => c.sessions, { onDelete: 'CASCADE' })
  classRef: ClassEntity;

  /** Inicio de la sesión (UTC/zonificado con timestamptz) */
  @Column({ type: 'timestamptz' })
  startAt: Date;

  /** Duración en minutos (puede sobreescribir el default de ClassEntity) */
  @Column({ type: 'int' })
  durationMin: number;

  /** Capacidad (puede sobreescribir el default de ClassEntity) */
  @Column({ type: 'int' })
  capacity: number;

  /** Conteo de reservas confirmadas (derivado de reservations, pero útil para lecturas rápidas) */
  @Column({ type: 'int', default: 0 })
  reservedCount: number;

  @Column({
    type: 'enum',
    enum: ClassSessionStatus,
    default: ClassSessionStatus.SCHEDULED,
  })
  status: ClassSessionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** Derivado (no se persiste): fin = startAt + durationMin */
  get endAt(): Date {
    return new Date(this.startAt.getTime() + this.durationMin * 60_000);
  }
}
