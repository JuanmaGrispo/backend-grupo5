// src/attendance/attendance.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ClassSession } from '../class/class-session.entity';

@Entity('attendances')
@Unique(['user', 'session'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ClassSession, { eager: true, onDelete: 'CASCADE' })
  session: ClassSession;

  @CreateDateColumn()
  createdAt: Date;
}
