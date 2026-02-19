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
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@CurrentUser() user: AuthUser) {
    return this.usersService.listUsers(user.firmId);
  }

  @Roles('admin')
  @Post('invite')
  createInvite(@CurrentUser() user: AuthUser, @Body() dto: InviteUserDto) {
    return this.usersService.createInvite(
      user.firmId,
      dto.email,
      dto.role ?? 'preparer',
    );
  }

  @Get('invites')
  listInvites(@CurrentUser() user: AuthUser) {
    return this.usersService.listInvites(user.firmId);
  }

  @Roles('admin')
  @Delete('invites/:id')
  revokeInvite(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) inviteId: string,
  ) {
    return this.usersService.revokeInvite(user.firmId, inviteId);
  }

  @Roles('admin')
  @Patch(':id/role')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(
      user.firmId,
      userId,
      dto.role,
      user.userId,
    );
  }

  @Roles('admin')
  @Delete(':id')
  removeUser(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) userId: string,
  ) {
    return this.usersService.removeUser(user.firmId, userId, user.userId);
  }
}
