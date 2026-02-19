import { Module } from '@nestjs/common';
import { RolloverService } from './rollover.service';
import { RolloverController } from './rollover.controller';

@Module({
  controllers: [RolloverController],
  providers: [RolloverService],
  exports: [RolloverService],
})
export class RolloverModule {}
