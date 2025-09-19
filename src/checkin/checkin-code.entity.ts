import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ClassSession } from '../class/class-session.entity';

@Entity('checkin_codes')
export class CheckinCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  code: string; // token que va dentro del QR

  @ManyToOne(() => ClassSession, { onDelete: 'SET NULL', nullable: true, eager: true })
  session?: ClassSession; // si es null → QR general por sede/puerta

  @Column({ nullable: true })
  locationName?: string; // para QR de sede

  @Column({ type: 'timestamptz' })
  validFrom: Date;

  @Column({ type: 'timestamptz' })
  validTo: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
