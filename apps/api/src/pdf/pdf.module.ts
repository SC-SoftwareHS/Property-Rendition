import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { FormStrategyFactory } from './strategies/form-strategy.factory';
import { DepreciationModule } from '../depreciation/depreciation.module';

@Module({
  imports: [DepreciationModule],
  providers: [PdfService, FormStrategyFactory],
  exports: [PdfService],
})
export class PdfModule {}
