import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService, type ColumnMapping } from './import.service';
import { AssetsService } from '../assets/assets.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly assetsService: AssetsService,
  ) {}

  @Post('parse')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  parse(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = this.importService.parseFile(file.buffer, file.originalname);
    const suggestedMapping = this.importService.autoMapColumns(result.headers);

    return {
      ...result,
      suggestedMapping,
    };
  }

  @Post('execute/:clientId/:locationId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async execute(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingJson: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let mapping: ColumnMapping;
    try {
      mapping = JSON.parse(mappingJson);
    } catch {
      throw new BadRequestException('Invalid mapping JSON');
    }

    const { assets, errors } = this.importService.mapAndValidate(
      file.buffer,
      file.originalname,
      mapping,
    );

    if (assets.length === 0) {
      return {
        inserted: 0,
        errors,
        message: 'No valid assets to import',
      };
    }

    const result = await this.assetsService.bulkCreate(
      user.firmId,
      clientId,
      locationId,
      assets.map((a) => ({
        description: a.description,
        category: a.category,
        originalCost: a.originalCost,
        acquisitionDate: a.acquisitionDate,
        disposalDate: a.disposalDate,
        quantity: a.quantity,
        isLeased: a.isLeased,
        lessorName: a.lessorName,
        lessorAddress: a.lessorAddress,
        notes: a.notes,
      })),
    );

    return {
      inserted: result.inserted,
      errors,
      total: assets.length + errors.length,
      message: `Successfully imported ${result.inserted} assets${errors.length > 0 ? `, ${errors.length} rows had errors` : ''}`,
    };
  }
}
