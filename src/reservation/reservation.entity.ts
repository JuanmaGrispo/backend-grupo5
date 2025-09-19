import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ClassSession } from '../class/class-session.entity';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => ClassSession, { eager: true })
  session: ClassSession;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.CONFIRMED })
  status: ReservationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  canceledAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
