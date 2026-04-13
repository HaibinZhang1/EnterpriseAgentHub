import type { BootstrapContext, LocalEvent, LocalNotification, MarketFilters, SkillSummary } from "../domain/p1";

interface ServerSkillSummary {
  skillID: string;
  displayName: string;
  description: string;
  version: string;
  status: SkillSummary["status"];
  visibilityLevel: SkillSummary["visibilityLevel"];
  detailAccess: SkillSummary["detailAccess"];
  canInstall: boolean;
  canUpdate?: boolean;
  cannotInstallReason?: string;
  installState: SkillSummary["installState"];
  authorName?: string;
  authorDepartment?: string;
  currentVersionUpdatedAt: string;
  publishedAt?: string;
  compatibleTools: string[];
  compatibleSystems: string[];
  tags?: string[];
  category?: string;
  riskLevel?: SkillSummary["riskLevel"];
  starCount: number;
  downloadCount: number;
  readme?: string;
  reviewSummary?: string;
  latestVersion?: string;
}

interface ServerNotification {
  notificationID: string;
  type: LocalNotification["type"];
  title: string;
  summary: string;
  objectID?: string;
  createdAt: string;
  read: boolean;
  action?: string;
}

const DEFAULT_API_BASE_URL = import.meta.env.VITE_DESKTOP_API_BASE_URL ?? "http://127.0.0.1:3000";
let currentApiBaseUrl = normalizeBaseUrl(DEFAULT_API_BASE_URL);

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveTargetPage(action?: string): LocalNotification["targetPage"] {
  if (action?.startsWith("/skills/")) {
    return "market";
  }
  if (action === "/notifications") {
    return "notifications";
  }
  return "home";
}

function toLocalNotification(notification: ServerNotification): LocalNotification {
  return {
    notificationID: notification.notificationID,
    type: notification.type,
    title: notification.title,
    summary: notification.summary,
    relatedSkillID: notification.objectID ?? null,
    targetPage: resolveTargetPage(notification.action),
    occurredAt: notification.createdAt,
    unread: !notification.read,
    source: "server"
  };
}

function toSkillSummary(skill: ServerSkillSummary): SkillSummary {
  return {
    skillID: skill.skillID,
    displayName: skill.displayName,
    description: skill.description,
    version: skill.version,
    localVersion: null,
    latestVersion: skill.latestVersion ?? skill.version,
    status: skill.status,
    visibilityLevel: skill.visibilityLevel,
    detailAccess: skill.detailAccess,
    canInstall: skill.canInstall,
    canUpdate: skill.canUpdate ?? false,
    cannotInstallReason: skill.cannotInstallReason,
    installState: skill.installState,
    authorName: skill.authorName,
    authorDepartment: skill.authorDepartment,
    currentVersionUpdatedAt: skill.currentVersionUpdatedAt,
    publishedAt: skill.publishedAt ?? skill.currentVersionUpdatedAt,
    compatibleTools: skill.compatibleTools,
    compatibleSystems: skill.compatibleSystems,
    tags: skill.tags ?? [],
    category: skill.category ?? "uncategorized",
    riskLevel: skill.riskLevel ?? "unknown",
    starCount: skill.starCount,
    downloadCount: skill.downloadCount,
    starred: false,
    readme: skill.readme,
    reviewSummary: skill.reviewSummary,
    isScopeRestricted: Boolean(skill.cannotInstallReason === "scope_restricted"),
    hasLocalHashDrift: false,
    enabledTargets: [],
    lastEnabledAt: null
  };
}

async function requestJSON<T>(path: string, init?: RequestInit, baseUrl = currentApiBaseUrl): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
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
      throw new Error("Username and password are required");
    }

    currentApiBaseUrl = normalizeBaseUrl(input.serverURL || DEFAULT_API_BASE_URL);
    await requestJSON("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: input.username, password: input.password })
    });
    return await requestJSON<BootstrapContext>("/desktop/bootstrap");
  },

  async bootstrap() {
    return await requestJSON<BootstrapContext>("/desktop/bootstrap");
  },

  async listSkills(filters) {
    const response = await requestJSON<{ items: ServerSkillSummary[] }>(`/skills?${new URLSearchParams({ q: filters.query })}`);
    return filterSkills(response.items.map(toSkillSummary), filters);
  },

  async getSkill(skillID) {
    const response = await requestJSON<ServerSkillSummary>(`/skills/${encodeURIComponent(skillID)}`);
    return toSkillSummary(response);
  },

  async star(skillID, starred) {
    return await requestJSON(`/skills/${encodeURIComponent(skillID)}/star`, { method: starred ? "POST" : "DELETE" });
  },

  async listNotifications(unreadOnly = false) {
    const response = await requestJSON<{ items: ServerNotification[] }>(`/notifications?unreadOnly=${String(unreadOnly)}`);
    return response.items.map(toLocalNotification);
  },

  async markNotificationsRead(notificationIDs) {
    return await requestJSON<{ unreadNotificationCount: number }>("/notifications/mark-read", {
      method: "POST",
      body: JSON.stringify({ notificationIDs: notificationIDs === "all" ? [] : notificationIDs, all: notificationIDs === "all" })
    });
  },

  async syncLocalEvents(events) {
    return await requestJSON("/desktop/local-events", {
      method: "POST",
      body: JSON.stringify({ deviceID: "desktop_mock_001", events })
    });
  }
};
