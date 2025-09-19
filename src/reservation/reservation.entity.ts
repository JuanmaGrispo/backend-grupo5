import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { ClassSession } from '../class/class-session.entity';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELED  = 'CANCELED',
  EXPIRED   = 'EXPIRED',
}

@Entity('reservations')
@Index(['user', 'session'], { unique: true })
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @ManyToOne(() => ClassSession, { onDelete: 'CASCADE', eager: true })
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
