import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NotificationDto, PageResponse } from '../common/p1-contracts';
import { MarkReadRequest, NotificationsQuery, NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Query() query: NotificationsQuery): PageResponse<NotificationDto> {
    return this.notificationsService.list(query);
  }

  @Post('mark-read')
  markRead(@Body() body: MarkReadRequest): { unreadNotificationCount: number } {
    return this.notificationsService.markRead(body);
  }
}
