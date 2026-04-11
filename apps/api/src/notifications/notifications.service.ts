import { Injectable } from '@nestjs/common';
import { NotificationDto, PageResponse, pageOf } from '../common/p1-contracts';
import { p1Notifications } from '../database/p1-seed';

export interface NotificationsQuery {
  unreadOnly?: string;
  page?: string;
  pageSize?: string;
}

export interface MarkReadRequest {
  notificationIDs?: string[];
  all?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly readIDs = new Set(p1Notifications.filter((notification) => notification.read).map((notification) => notification.notificationID));

  list(query: NotificationsQuery): PageResponse<NotificationDto> {
    const page = positiveInt(query.page, 1);
    const pageSize = positiveInt(query.pageSize, 20, 100);
    const items = p1Notifications
      .map((notification) => ({ ...notification, read: this.readIDs.has(notification.notificationID) }))
      .filter((notification) => query.unreadOnly !== 'true' || !notification.read);
    const start = (page - 1) * pageSize;
    return pageOf(items.slice(start, start + pageSize), page, pageSize, items.length);
  }

  markRead(request: MarkReadRequest): { unreadNotificationCount: number } {
    if (request.all) {
      for (const notification of p1Notifications) {
        this.readIDs.add(notification.notificationID);
      }
    } else {
      for (const notificationID of request.notificationIDs ?? []) {
        this.readIDs.add(notificationID);
      }
    }

    return {
      unreadNotificationCount: p1Notifications.filter((notification) => !this.readIDs.has(notification.notificationID)).length,
    };
  }
}

function positiveInt(value: string | undefined, fallback: number, max = 100): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}
