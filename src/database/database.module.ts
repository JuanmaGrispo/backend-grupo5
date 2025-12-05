import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeeder } from './database.seeder';
import { User } from '../user/user.entity';
import { ClassEntity } from '../class/class.entity';
import { ClassSession } from '../class/class-session.entity';
import { Branch } from '../branch/branch.entity';
import { Reservation } from '../reservation/reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ClassEntity,
      ClassSession,
      Branch,
      Reservation,
    ]),
  ],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class DatabaseModule {}

