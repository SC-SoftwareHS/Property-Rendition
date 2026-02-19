import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { RolloverService } from './rollover.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class RolloverDto {
  @IsInt()
  @Min(2000)
  fromYear!: number;

  @IsInt()
  @Min(2001)
  toYear!: number;
}

@Controller('rollover')
export class RolloverController {
  constructor(private readonly rolloverService: RolloverService) {}

  @Post()
  rollover(@CurrentUser() user: AuthUser, @Body() dto: RolloverDto) {
    return this.rolloverService.rolloverToYear(user.firmId, dto.fromYear, dto.toYear);
  }

  @Get('status')
  getStatus(
    @CurrentUser() user: AuthUser,
    @Query('taxYear') taxYear: string,
  ) {
    return this.rolloverService.getRolloverStatus(user.firmId, parseInt(taxYear, 10));
  }
}
