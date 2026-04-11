import { Body, Controller, Get, Post } from '@nestjs/common';
import { BootstrapResponse, DesktopService, LocalEventsRequest, LocalEventsResponse } from './desktop.service';

@Controller('desktop')
export class DesktopController {
  constructor(private readonly desktopService: DesktopService) {}

  @Get('bootstrap')
  bootstrap(): BootstrapResponse {
    return this.desktopService.bootstrap();
  }

  @Post('local-events')
  localEvents(@Body() body: LocalEventsRequest): LocalEventsResponse {
    return this.desktopService.acceptLocalEvents(body);
  }
}
