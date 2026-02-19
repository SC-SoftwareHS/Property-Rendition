import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import archiver from 'archiver';
import { Response } from 'express';
import { RenditionsService } from './renditions.service';
import { CreateRenditionDto } from './dto/create-rendition.dto';
import { UpdateRenditionStatusDto } from './dto/update-rendition-status.dto';
import { BatchGenerateDto } from './dto/batch-generate.dto';
import { UpdateFmvOverridesDto } from './dto/update-fmv-overrides.dto';
import { UpdateHb9SettingsDto } from './dto/update-hb9-settings.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PdfService } from '../pdf/pdf.service';
import { BatchCoverLetterGenerator, BatchRenditionEntry } from '../pdf/strategies/batch-cover-letter.strategy';

@Controller()
export class RenditionsController {
  private readonly coverLetterGenerator = new BatchCoverLetterGenerator();

  constructor(
    private readonly renditionsService: RenditionsService,
    private readonly pdfService: PdfService,
  ) {}

  // --- Nested location-scoped endpoints ---

  @Get('clients/:clientId/locations/:locationId/renditions')
  findAllForLocation(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.renditionsService.findAllForLocation(user.firmId, clientId, locationId);
  }

  @Post('clients/:clientId/locations/:locationId/renditions')
  create(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: CreateRenditionDto,
  ) {
    return this.renditionsService.create(user.firmId, clientId, locationId, dto.taxYear);
  }

  @Get('clients/:clientId/locations/:locationId/renditions/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.renditionsService.findOne(user.firmId, clientId, locationId, id);
  }

  @Post('clients/:clientId/locations/:locationId/renditions/:id/recalculate')
  recalculate(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.renditionsService.recalculate(user.firmId, clientId, locationId, id);
  }

  @Roles('admin', 'reviewer')
  @Patch('clients/:clientId/locations/:locationId/renditions/:id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRenditionStatusDto,
  ) {
    return this.renditionsService.updateStatus(
      user.firmId,
      clientId,
      locationId,
      id,
      dto.status,
      user.userId,
    );
  }

  @Roles('admin')
  @Delete('clients/:clientId/locations/:locationId/renditions/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.renditionsService.remove(user.firmId, clientId, locationId, id);
  }

  // --- HB 9 exemption settings ---

  @Patch('clients/:clientId/locations/:locationId/renditions/:id/hb9')
  updateHb9Settings(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHb9SettingsDto,
  ) {
    return this.renditionsService.updateHb9Settings(
      user.firmId,
      clientId,
      locationId,
      id,
      dto,
    );
  }

  // --- FMV Override endpoints ---

  @Patch('clients/:clientId/locations/:locationId/renditions/:id/fmv-overrides')
  updateFmvOverrides(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFmvOverridesDto,
  ) {
    return this.renditionsService.updateFmvOverrides(
      user.firmId,
      clientId,
      locationId,
      id,
      dto.overrides,
      user.userId,
    );
  }

  @Delete('clients/:clientId/locations/:locationId/renditions/:id/fmv-overrides/:assetId')
  removeFmvOverride(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.renditionsService.removeFmvOverride(
      user.firmId,
      clientId,
      locationId,
      id,
      assetId,
    );
  }

  // --- PDF endpoints ---

  @Roles('admin', 'reviewer')
  @Post('clients/:clientId/locations/:locationId/renditions/:id/generate-pdf')
  async generatePdf(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { pdfBytes, filename } = await this.pdfService.generatePdf(
      user.firmId,
      clientId,
      locationId,
      id,
    );

    // Update rendition status to filed and store a reference
    await this.renditionsService.updateStatus(
      user.firmId,
      clientId,
      locationId,
      id,
      'filed',
      user.userId,
    );

    return {
      message: 'PDF generated successfully',
      filename,
      sizeBytes: pdfBytes.length,
    };
  }

  @Get('clients/:clientId/locations/:locationId/renditions/:id/pdf')
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { pdfBytes, filename } = await this.pdfService.generatePdf(
      user.firmId,
      clientId,
      locationId,
      id,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length,
    });

    res.send(pdfBytes);
  }

  // --- Depreciation schedule endpoint ---

  @Get('clients/:clientId/locations/:locationId/renditions/:id/depreciation-schedule')
  async downloadDepreciationSchedule(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { pdfBytes, filename } = await this.pdfService.generateDepreciationSchedule(
      user.firmId,
      clientId,
      locationId,
      id,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length,
    });

    res.send(pdfBytes);
  }

  // --- Batch generation endpoints ---

  @Roles('admin', 'reviewer')
  @Post('renditions/batch-generate')
  async batchGenerate(
    @CurrentUser() user: AuthUser,
    @Body() dto: BatchGenerateDto,
  ) {
    const { result } = await this.renditionsService.batchGenerate(
      user.firmId,
      user.userId,
      dto,
    );
    return result;
  }

  @Roles('admin', 'reviewer')
  @Post('renditions/batch-generate-zip')
  async batchGenerateZip(
    @CurrentUser() user: AuthUser,
    @Body() dto: BatchGenerateDto,
    @Res() res: Response,
  ) {
    const { result, pdfBuffers, scheduleBuffers, coverLetterEntries } =
      await this.renditionsService.batchGenerate(user.firmId, user.userId, dto);

    if (pdfBuffers.length === 0) {
      res.status(400).json({
        message: 'No PDFs were generated successfully.',
        ...result,
      });
      return;
    }

    const taxYear = dto.taxYear ?? new Date().getFullYear();
    const zipFilename = `renditions-${taxYear}-${Date.now()}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFilename}"`,
    });

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    // Primary rendition forms
    for (const { filename, buffer } of pdfBuffers) {
      archive.append(buffer, { name: `forms/${filename}` });
    }

    // Depreciation schedules
    for (const { filename, buffer } of scheduleBuffers) {
      archive.append(buffer, { name: `schedules/${filename}` });
    }

    // Batch cover letter
    if (coverLetterEntries.length > 0) {
      const coverBytes = await this.coverLetterGenerator.generate(
        'CPA Firm',
        user.userId,
        coverLetterEntries,
        taxYear,
      );
      archive.append(Buffer.from(coverBytes), {
        name: `Cover-Letter-${taxYear}.pdf`,
      });
    }

    await archive.finalize();
  }

  // --- Firm-wide dashboard endpoint (intentionally not nested) ---

  @Get('renditions')
  findAllForFirm(
    @CurrentUser() user: AuthUser,
    @Query('taxYear') taxYear?: string,
    @Query('status') status?: string,
  ) {
    return this.renditionsService.findAllForFirm(user.firmId, {
      taxYear: taxYear ? parseInt(taxYear, 10) : undefined,
      status,
    });
  }
}
