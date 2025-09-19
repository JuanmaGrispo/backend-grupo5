import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('user_otps')
export class UserOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column()
  email: string; // lo duplicamos para lookup rápido, aunque tengamos userId

  @Column()
  codeHash: string; // hash del código OTP (NUNCA guardes el código en claro)

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ default: 0 })
  attempts: number; // para limitar reintentos

  @CreateDateColumn()
  createdAt: Date;
}
