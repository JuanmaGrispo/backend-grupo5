import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ClassSession } from './class-session.entity';

@Entity('classes')
export class ClassEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column()
  title: string;
  @Column({ nullable: true }) 
  description?: string;

  @Column({ nullable: true }) 
  discipline?: string;

  @Column({ type: 'int', default: 60 }) 
  defaultDurationMin: number;
  
  @Column({ type: 'int', default: 20 }) 
  defaultCapacity: number;

  @Column({ nullable: true }) 
  instructorName?: string;

  @Column({ nullable: true }) 
  locationName?: string;

  @Column({ nullable: true }) 
  locationAddress?: string;

  @OneToMany(() => ClassSession, (s) => s.classRef) 
  sessions!: ClassSession[];

  @CreateDateColumn() 
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
