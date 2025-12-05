import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ClassSession } from '../class/class-session.entity';

export enum NotificationType {
  SESSION_CANCELED = 'SESSION_CANCELED',
  SESSION_RESCHEDULED = 'SESSION_RESCHEDULED',
  SESSION_REMINDER = 'SESSION_REMINDER',
}

@Entity('notifications')
@Index('idx_notification_user_read', ['user', 'read'])
@Index('idx_notification_user_created', ['user', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ClassSession, { eager: true, nullable: true })
  session: ClassSession | null;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}

