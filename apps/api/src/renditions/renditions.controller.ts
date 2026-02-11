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
import { Response } from 'express';
import { RenditionsService } from './renditions.service';
import { CreateRenditionDto } from './dto/create-rendition.dto';
import { UpdateRenditionStatusDto } from './dto/update-rendition-status.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { PdfService } from '../pdf/pdf.service';

@Controller()
export class RenditionsController {
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

  @Delete('clients/:clientId/locations/:locationId/renditions/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.renditionsService.remove(user.firmId, clientId, locationId, id);
  }

  // --- PDF endpoints ---

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
