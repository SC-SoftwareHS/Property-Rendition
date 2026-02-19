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
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clients/:clientId/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.locationsService.findAllForClient(user.firmId, clientId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.locationsService.findOne(user.firmId, clientId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(user.firmId, clientId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.firmId, clientId, id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.locationsService.softDelete(user.firmId, clientId, id);
  }
}
