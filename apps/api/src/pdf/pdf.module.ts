import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { DepreciationModule } from '../depreciation/depreciation.module';

@Module({
  imports: [DepreciationModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
