import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { ClassSession } from '../class/class-session.entity';

@Entity('attendances')
@Index(['user', 'session'], { unique: true }) // una asistencia por user+sesión
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @ManyToOne(() => ClassSession, { onDelete: 'CASCADE', eager: true })
  session: ClassSession;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  checkedInAt: Date;

  @Column({ default: 'QR' })
  method: string; // "QR" (u otro método en el futuro)

  @Column({ nullable: true })
  locationName?: string; // cache útil para historial

  @CreateDateColumn()
  createdAt: Date;
}
