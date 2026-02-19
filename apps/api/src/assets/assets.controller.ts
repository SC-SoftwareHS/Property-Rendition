import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { BulkCreateAssetsDto } from './dto/bulk-create-assets.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clients/:clientId/locations/:locationId/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.assetsService.findAllForLocation(user.firmId, clientId, locationId);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.assetsService.getLocationSummary(user.firmId, clientId, locationId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.findOne(user.firmId, clientId, locationId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(user.firmId, clientId, locationId, dto);
  }

  @Post('bulk')
  bulkCreate(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: BulkCreateAssetsDto,
  ) {
    return this.assetsService.bulkCreate(user.firmId, clientId, locationId, dto.assets);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(user.firmId, clientId, locationId, id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.softDelete(user.firmId, clientId, locationId, id);
  }
}
