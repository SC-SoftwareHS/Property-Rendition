import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { DepreciationService } from './depreciation.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('clients/:clientId/locations/:locationId/depreciation')
export class DepreciationController {
  constructor(private readonly depreciationService: DepreciationService) {}

  @Get('preview')
  preview(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Query('taxYear', ParseIntPipe) taxYear: number,
  ) {
    return this.depreciationService.calculateForLocation(
      user.firmId,
      clientId,
      locationId,
      taxYear,
    );
  }
}
