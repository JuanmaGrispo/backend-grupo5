import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { ClassEntity } from './class.entity';
import { ClassSession } from './class-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassEntity, ClassSession]),
  ],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService], 
})
export class ClassModule {}
