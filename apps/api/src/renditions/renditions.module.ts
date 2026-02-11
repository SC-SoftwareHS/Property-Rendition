import { Module } from '@nestjs/common';
import { RenditionsService } from './renditions.service';
import { RenditionsController } from './renditions.controller';
import { DepreciationModule } from '../depreciation/depreciation.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [DepreciationModule, PdfModule],
  providers: [RenditionsService],
  controllers: [RenditionsController],
  exports: [RenditionsService],
})
export class RenditionsModule {}
