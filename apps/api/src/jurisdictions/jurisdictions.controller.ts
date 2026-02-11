import { Controller, Get, Query } from '@nestjs/common';
import { JurisdictionsService } from './jurisdictions.service';

@Controller('jurisdictions')
export class JurisdictionsController {
  constructor(private readonly jurisdictionsService: JurisdictionsService) {}

  @Get()
  findByState(@Query('state') state: string) {
    return this.jurisdictionsService.findByState(state);
  }

  @Get('counties')
  findCounties(@Query('state') state: string) {
    return this.jurisdictionsService.findCountiesByState(state);
  }
}
