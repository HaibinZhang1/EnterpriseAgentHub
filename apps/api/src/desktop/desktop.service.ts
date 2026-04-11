import { Injectable } from '@nestjs/common';
import { ConnectionStatus, LocalEventDto, NotificationType, UserSummary } from '../common/p1-contracts';
import { p1Notifications, p1User } from '../database/p1-seed';

export interface BootstrapResponse {
  user: UserSummary;
  connection: {
    status: ConnectionStatus;
    serverTime: string;
    apiVersion: string;
  };
  features: {
    p1Desktop: true;
    publishSkill: false;
    reviewWorkbench: false;
    adminManage: false;
    mcpManage: false;
    pluginManage: false;
  };
  counts: {
    installedCount: number;
    updateAvailableCount: number;
    unreadNotificationCount: number;
  };
  navigation: string[];
}

export interface LocalEventsRequest {
  deviceID?: string;
  events?: LocalEventDto[];
}

export interface LocalEventsResponse {
  acceptedEventIDs: string[];
  rejectedEvents: Array<{ eventID?: string; code: string; message: string }>;
  serverStateChanged: boolean;
  remoteNotices: Array<{ skillID?: string; noticeType: NotificationType; message: string }>;
}

@Injectable()
export class DesktopService {
  private readonly acceptedEvents = new Set<string>();

  bootstrap(): BootstrapResponse {
    return {
      user: p1User,
      connection: {
        status: 'connected',
        serverTime: new Date().toISOString(),
        apiVersion: 'p1.0',
      },
      features: {
        p1Desktop: true,
        publishSkill: false,
        reviewWorkbench: false,
        adminManage: false,
        mcpManage: false,
        pluginManage: false,
      },
      counts: {
        installedCount: 0,
        updateAvailableCount: 1,
        unreadNotificationCount: p1Notifications.filter((notification) => !notification.read).length,
      },
      navigation: ['home', 'market', 'my_installed', 'tools', 'projects', 'notifications', 'settings'],
    };
  }

  acceptLocalEvents(request: LocalEventsRequest): LocalEventsResponse {
    const rejectedEvents: LocalEventsResponse['rejectedEvents'] = [];
    const acceptedEventIDs: string[] = [];

    if (!request.deviceID) {
      rejectedEvents.push({ code: 'device_required', message: 'deviceID is required' });
      return { acceptedEventIDs, rejectedEvents, serverStateChanged: false, remoteNotices: [] };
    }

    for (const event of request.events ?? []) {
      if (!event.eventID || !event.occurredAt || !event.result) {
        rejectedEvents.push({ eventID: event.eventID, code: 'invalid_event', message: 'eventID, occurredAt and result are required' });
        continue;
      }

      const idempotencyKey = `${request.deviceID}:${event.eventID}`;
      if (!this.acceptedEvents.has(idempotencyKey)) {
        this.acceptedEvents.add(idempotencyKey);
      }
      acceptedEventIDs.push(event.eventID);
    }

    return {
      acceptedEventIDs,
      rejectedEvents,
      serverStateChanged: acceptedEventIDs.length > 0,
      remoteNotices: acceptedEventIDs.length
        ? [
            {
              skillID: 'codex-review-helper',
              noticeType: 'skill_update_available',
              message: '该 Skill 有新版本可更新',
            },
          ]
        : [],
    };
  }
}
