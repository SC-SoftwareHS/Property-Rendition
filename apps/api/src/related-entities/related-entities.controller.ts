import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RelatedEntitiesService } from './related-entities.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('related-entities')
export class RelatedEntitiesController {
  constructor(private readonly service: RelatedEntitiesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAllGroups(user.firmId);
  }

  @Post()
  @Roles('admin')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: { name: string; notes?: string },
  ) {
    return this.service.createGroup(user.firmId, dto.name, dto.notes);
  }

  @Post(':groupId/members')
  @Roles('admin')
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: { clientId: string },
  ) {
    return this.service.addMember(user.firmId, groupId, dto.clientId);
  }

  @Delete(':groupId/members/:memberId')
  @Roles('admin')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.removeMember(user.firmId, groupId, memberId);
  }

  @Delete(':groupId')
  @Roles('admin')
  deleteGroup(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.service.deleteGroup(user.firmId, groupId);
  }
}
