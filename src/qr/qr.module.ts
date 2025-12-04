import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { ClassModule } from '../class/class.module';

@Module({
  imports: [ClassModule],
  providers: [QrService],
  controllers: [QrController],
  exports: [QrService]
})
export class QrModule {}
