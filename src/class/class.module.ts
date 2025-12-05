import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { ClassEntity } from './class.entity';
import { ClassSession } from './class-session.entity';
import { ReservationModule } from '../reservation/reservation.module';
import { NotifierModule } from '../notifier/notifier.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassEntity, ClassSession]),
    ReservationModule,
    forwardRef(() => NotifierModule),
  ],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService], 
})
export class ClassModule {}
