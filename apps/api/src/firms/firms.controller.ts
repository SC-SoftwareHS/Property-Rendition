import { Controller, Get, Patch, Body } from '@nestjs/common';
import { FirmsService } from './firms.service';
import { UpdateFirmDto } from './dto/update-firm.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('firms')
export class FirmsController {
  constructor(private readonly firmsService: FirmsService) {}

  @Get('me')
  getMyFirm(@CurrentUser() user: AuthUser) {
    return this.firmsService.findOne(user.firmId);
  }

  @Patch('me')
  updateMyFirm(@CurrentUser() user: AuthUser, @Body() dto: UpdateFirmDto) {
    return this.firmsService.update(user.firmId, dto);
  }
}
