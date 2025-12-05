import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ClassSession } from '../class/class-session.entity';

@Entity('session_ratings')
@Unique(['user', 'session']) // Un usuario solo puede calificar una sesión una vez
@Index('idx_rating_session', ['session']) // Para buscar calificaciones de una sesión
@Index('idx_rating_user', ['user']) // Para buscar calificaciones de un usuario
@Check(`"rating" >= 1 AND "rating" <= 5`) // Validación de rating entre 1 y 5
export class SessionRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con User
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  // Relación con ClassSession
  @ManyToOne(() => ClassSession, { eager: true, onDelete: 'CASCADE' })
  session: ClassSession;

  // Calificación (1-5 estrellas)
  @Column({ type: 'int' })
  rating: number;

  // Comentario (opcional)
  @Column({ type: 'text', nullable: true })
  comment?: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
