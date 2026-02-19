import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

const VALID_FORMATS = ['csv', 'xlsx', 'json'] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('clients')
  async exportClients(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('format') format: string = 'csv',
  ) {
    const fmt = this.validateFormat(format);
    const result = await this.exportService.exportClients(user.firmId, fmt);
    this.sendFile(res, result);
  }

  @Get('assets')
  async exportAssets(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('format') format: string = 'csv',
    @Query('clientId') clientId?: string,
    @Query('locationId') locationId?: string,
  ) {
    const fmt = this.validateFormat(format);
    const result = await this.exportService.exportAssets(user.firmId, fmt, {
      clientId,
      locationId,
    });
    this.sendFile(res, result);
  }

  @Get('renditions')
  async exportRenditions(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('format') format: string = 'csv',
    @Query('taxYear') taxYear?: string,
    @Query('status') status?: string,
  ) {
    const fmt = this.validateFormat(format);
    const result = await this.exportService.exportRenditions(user.firmId, fmt, {
      taxYear: taxYear ? parseInt(taxYear, 10) : undefined,
      status,
    });
    this.sendFile(res, result);
  }

  private validateFormat(format: string): ExportFormat {
    if (!VALID_FORMATS.includes(format as ExportFormat)) {
      throw new BadRequestException(
        `Invalid format "${format}". Must be one of: ${VALID_FORMATS.join(', ')}`,
      );
    }
    return format as ExportFormat;
  }

  private sendFile(
    res: Response,
    result: { buffer: Buffer; contentType: string; filename: string },
  ) {
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length.toString(),
    });
    res.send(result.buffer);
  }
}
