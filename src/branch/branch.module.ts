import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { Branch } from './branch.entity'; // 👈 tu entity

@Module({
  imports: [TypeOrmModule.forFeature([Branch])], // 👈 registro del entity
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService], // opcional, solo si lo usás desde otros módulos
})
export class BranchModule {}
