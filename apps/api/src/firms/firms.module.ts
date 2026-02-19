import { Module } from '@nestjs/common';
import { FirmsService } from './firms.service';
import { FirmsController } from './firms.controller';

@Module({
  controllers: [FirmsController],
  providers: [FirmsService],
  exports: [FirmsService],
})
export class FirmsModule {}
