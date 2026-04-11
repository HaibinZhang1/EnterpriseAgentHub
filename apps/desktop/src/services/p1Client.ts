import { seedBootstrap, seedNotifications, seedSkills } from "../fixtures/p1SeedData";
import type { BootstrapContext, LocalEvent, LocalNotification, MarketFilters, SkillSummary } from "../domain/p1";

const API_PREFIX = import.meta.env.VITE_DESKTOP_API_PREFIX ?? "/api/v1";

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
    ...init
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

const textIncludes = (source: string | undefined, query: string) => source?.toLocaleLowerCase().includes(query) ?? false;

function filterSkills(skills: SkillSummary[], filters: MarketFilters): SkillSummary[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const filtered = skills.filter((skill) => {
    const matchesQuery =
      query.length === 0 ||
      textIncludes(skill.displayName, query) ||
      textIncludes(skill.description, query) ||
      textIncludes(skill.skillID, query) ||
      textIncludes(skill.authorName, query) ||
      textIncludes(skill.authorDepartment, query) ||
      skill.tags.some((tag) => textIncludes(tag, query));
    const matchesDepartment = filters.department === "all" || skill.authorDepartment === filters.department;
    const matchesTool = filters.compatibleTool === "all" || skill.compatibleTools.includes(filters.compatibleTool);
    const matchesInstalled =
      filters.installed === "all" ||
      (filters.installed === "installed" ? skill.localVersion !== null : skill.localVersion === null);
    const matchesEnabled =
      filters.enabled === "all" ||
      (filters.enabled === "enabled" ? skill.enabledTargets.length > 0 : skill.enabledTargets.length === 0);
    const matchesAccess = filters.accessScope === "include_public" || skill.detailAccess === "full";
    const matchesRisk = filters.riskLevel === "all" || skill.riskLevel === filters.riskLevel;

    return matchesQuery && matchesDepartment && matchesTool && matchesInstalled && matchesEnabled && matchesAccess && matchesRisk;
  });

  return [...filtered].sort((left, right) => {
    switch (filters.sort) {
      case "latest_published":
        return right.publishedAt.localeCompare(left.publishedAt);
      case "recently_updated":
        return right.currentVersionUpdatedAt.localeCompare(left.currentVersionUpdatedAt);
      case "download_count":
        return right.downloadCount - left.downloadCount;
      case "star_count":
        return right.starCount - left.starCount;
      case "relevance":
        return Number(textIncludes(right.skillID, query)) - Number(textIncludes(left.skillID, query));
      case "composite":
      default:
        return right.starCount + right.downloadCount - (left.starCount + left.downloadCount);
    }
  });
}

export interface P1Client {
  login(input: { username: string; password: string; serverURL: string }): Promise<BootstrapContext>;
  bootstrap(): Promise<BootstrapContext>;
  listSkills(filters: MarketFilters): Promise<SkillSummary[]>;
  getSkill(skillID: string): Promise<SkillSummary>;
  star(skillID: string, starred: boolean): Promise<{ skillID: string; starred: boolean; starCount: number }>;
  listNotifications(unreadOnly?: boolean): Promise<LocalNotification[]>;
  markNotificationsRead(notificationIDs: string[] | "all"): Promise<{ unreadNotificationCount: number }>;
  syncLocalEvents(events: LocalEvent[]): Promise<{ acceptedEventIDs: string[]; rejectedEvents: LocalEvent[]; serverStateChanged: boolean }>;
}

export const p1Client: P1Client = {
  async login(input) {
    if (input.username.trim().length === 0 || input.password.trim().length === 0) {
      throw new Error("账号或密码不正确");
    }

    if (input.serverURL.includes("mock")) {
      return seedBootstrap;
    }

    try {
      await requestJSON("/auth/login", { method: "POST", body: JSON.stringify(input) });
      return await requestJSON<BootstrapContext>("/desktop/bootstrap");
    } catch {
      return seedBootstrap;
    }
  },

  async bootstrap() {
    try {
      return await requestJSON<BootstrapContext>("/desktop/bootstrap");
    } catch {
      return seedBootstrap;
    }
  },

  async listSkills(filters) {
    try {
      const response = await requestJSON<{ items: SkillSummary[] }>(`/skills?${new URLSearchParams({ q: filters.query })}`);
      return filterSkills(response.items, filters);
    } catch {
      return filterSkills(seedSkills, filters);
    }
  },

  async getSkill(skillID) {
    try {
      return await requestJSON<SkillSummary>(`/skills/${encodeURIComponent(skillID)}`);
    } catch {
      const skill = seedSkills.find((item) => item.skillID === skillID);
      if (!skill) {
        throw new Error("Skill 不存在或不可见");
      }
      return skill;
    }
  },

  async star(skillID, starred) {
    try {
      return await requestJSON(`/skills/${encodeURIComponent(skillID)}/star`, { method: starred ? "POST" : "DELETE" });
    } catch {
      const skill = seedSkills.find((item) => item.skillID === skillID);
      return { skillID, starred, starCount: Math.max(0, (skill?.starCount ?? 0) + (starred ? 1 : -1)) };
    }
  },

  async listNotifications(unreadOnly = false) {
    try {
      const response = await requestJSON<{ items: LocalNotification[] }>(`/notifications?unreadOnly=${String(unreadOnly)}`);
      return response.items;
    } catch {
      return seedNotifications.filter((notification) => (unreadOnly ? notification.unread : true));
    }
  },

  async markNotificationsRead(notificationIDs) {
    try {
      return await requestJSON<{ unreadNotificationCount: number }>("/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationIDs: notificationIDs === "all" ? [] : notificationIDs, all: notificationIDs === "all" })
      });
    } catch {
      return { unreadNotificationCount: 0 };
    }
  },

  async syncLocalEvents(events) {
    try {
      return await requestJSON("/desktop/local-events", {
        method: "POST",
        body: JSON.stringify({ deviceID: "desktop_mock_001", events })
      });
    } catch {
      return { acceptedEventIDs: events.map((event) => event.eventID), rejectedEvents: [], serverStateChanged: false };
    }
  }
};
