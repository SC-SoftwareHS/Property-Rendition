import { Module } from '@nestjs/common';
import { DepreciationService } from './depreciation.service';
import { DepreciationController } from './depreciation.controller';

@Module({
  providers: [DepreciationService],
  controllers: [DepreciationController],
  exports: [DepreciationService],
})
export class DepreciationModule {}
