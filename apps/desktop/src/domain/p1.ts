export type SkillStatus = "published" | "delisted" | "archived";
export type VisibilityLevel = "private" | "summary_visible" | "detail_visible" | "public_installable";
export type DetailAccess = "none" | "summary" | "full";
export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type InstallState = "not_installed" | "installed" | "enabled" | "update_available" | "blocked";
export type ConnectionStatus = "connected" | "connecting" | "offline" | "failed";
export type TargetType = "tool" | "project";
export type AdapterStatus = "detected" | "manual" | "missing" | "invalid" | "disabled";
export type RequestedMode = "symlink" | "copy";
export type ResolvedMode = "symlink" | "copy";
export type MenuPermission =
  | "home"
  | "market"
  | "my_installed"
  | "review"
  | "manage"
  | "tools"
  | "projects"
  | "notifications"
  | "settings";
export type NotificationType =
  | "skill_update_available"
  | "skill_scope_restricted"
  | "local_copy_blocked"
  | "connection_restored"
  | "connection_failed"
  | "target_path_invalid"
  | "install_result"
  | "update_result"
  | "uninstall_result"
  | "enable_result"
  | "disable_result";
export type ReviewStatus = "pending" | "in_review" | "reviewed";
export type ReviewType = "publish" | "update" | "permission_change";
export type AuthState = "guest" | "authenticated";

export type PageID = MenuPermission;

export interface P1User {
  userID: string;
  displayName: string;
  role: string;
  adminLevel?: number;
  departmentID: string;
  departmentName: string;
  locale: string;
}

export interface BootstrapContext {
  user: P1User;
  connection: {
    status: ConnectionStatus;
    serverTime: string;
    apiVersion: string;
    lastError?: string;
  };
  features: {
    p1Desktop: boolean;
    publishSkill: boolean;
    reviewWorkbench: boolean;
    adminManage: boolean;
    mcpManage: boolean;
    pluginManage: boolean;
  };
  counts: {
    installedCount: number;
    enabledCount: number;
    updateAvailableCount: number;
    unreadNotificationCount: number;
  };
  navigation: PageID[];
  menuPermissions: MenuPermission[];
}

export interface EnabledTarget {
  id?: string;
  skillID?: string;
  targetType: TargetType;
  targetID: string;
  targetName: string;
  targetPath: string;
  installMode?: RequestedMode;
  requestedMode: RequestedMode;
  resolvedMode: ResolvedMode;
  fallbackReason: string | null;
  enabledAt: string;
  status?: "enabled" | "disabled" | "failed";
  lastError?: string | null;
}

export interface DownloadTicket {
  skillID: string;
  version: string;
  packageRef: string;
  packageURL: string;
  packageHash: `sha256:${string}`;
  packageSize: number;
  packageFileCount: number;
  expiresAt: string;
}

export interface LocalSkillInstall {
  skillID: string;
  displayName: string;
  localVersion: string;
  localHash: string;
  sourcePackageHash: string;
  installedAt: string;
  updatedAt: string;
  localStatus: "installed" | "enabled" | "partially_failed";
  centralStorePath: string;
  enabledTargets: EnabledTarget[];
  hasUpdate: boolean;
  isScopeRestricted: boolean;
  canUpdate: boolean;
}

export interface LocalBootstrap {
  installs: LocalSkillInstall[];
  tools: ToolConfig[];
  projects: ProjectConfig[];
  pendingOfflineEventCount: number;
  unreadLocalNotificationCount: number;
  centralStorePath: string;
}

export interface SkillSummary {
  skillID: string;
  displayName: string;
  description: string;
  version: string;
  localVersion: string | null;
  status: SkillStatus;
  visibilityLevel: VisibilityLevel;
  detailAccess: DetailAccess;
  canInstall: boolean;
  canUpdate: boolean;
  cannotInstallReason?: string;
  installState: InstallState;
  authorName?: string;
  authorDepartment?: string;
  currentVersionUpdatedAt: string;
  publishedAt: string;
  compatibleTools: string[];
  compatibleSystems: string[];
  tags: string[];
  category: string;
  riskLevel: RiskLevel;
  starCount: number;
  downloadCount: number;
  starred: boolean;
  readme?: string;
  reviewSummary?: string;
  latestVersion?: string;
  isScopeRestricted: boolean;
  hasLocalHashDrift: boolean;
  enabledTargets: EnabledTarget[];
  lastEnabledAt: string | null;
}

export interface ToolConfig {
  toolID: string;
  name: string;
  configPath: string;
  skillsPath: string;
  enabled: boolean;
  status: AdapterStatus;
  transform: "codex_skill" | "claude_skill" | "cursor_rule" | "windsurf_rule" | "opencode_skill" | "generic_directory";
  enabledSkillCount: number;
}

export interface ProjectConfig {
  projectID: string;
  name: string;
  projectPath: string;
  skillsPath: string;
  enabled: boolean;
  enabledSkillCount: number;
}

export interface LocalNotification {
  notificationID: string;
  type: NotificationType;
  title: string;
  summary: string;
  relatedSkillID: string | null;
  targetPage: PageID;
  occurredAt: string;
  unread: boolean;
  source: "server" | "local" | "sync";
}

export interface LocalEvent {
  eventID: string;
  eventType: Extract<NotificationType, "enable_result" | "disable_result" | "uninstall_result" | "target_path_invalid" | "local_copy_blocked">;
  skillID: string;
  version: string;
  targetType: TargetType;
  targetID: string;
  targetPath: string;
  requestedMode: RequestedMode;
  resolvedMode: ResolvedMode;
  fallbackReason: string | null;
  occurredAt: string;
  result: "success" | "failed";
}

export interface OperationProgress {
  operation: "install" | "update" | "enable" | "disable" | "uninstall";
  skillID: string;
  stage: string;
  result: "running" | "success" | "failed";
  message: string;
}

export interface MarketFilters {
  query: string;
  department: string;
  compatibleTool: string;
  installed: "all" | "installed" | "not_installed";
  enabled: "all" | "enabled" | "not_enabled";
  accessScope: "include_public" | "authorized_only";
  riskLevel: "all" | RiskLevel;
  sort: "composite" | "latest_published" | "recently_updated" | "download_count" | "star_count" | "relevance";
}

export interface DepartmentNode {
  departmentID: string;
  parentDepartmentID: string | null;
  name: string;
  path: string;
  level: number;
  status: string;
  userCount: number;
  skillCount: number;
  children: DepartmentNode[];
}

export interface AdminUser {
  userID: string;
  username: string;
  displayName: string;
  departmentID: string;
  departmentName: string;
  role: "normal_user" | "admin";
  adminLevel: number | null;
  status: "active" | "frozen" | "deleted";
  publishedSkillCount: number;
  starCount: number;
}

export interface AdminSkill {
  skillID: string;
  displayName: string;
  publisherName: string;
  departmentID: string;
  departmentName: string;
  version: string;
  status: SkillStatus;
  visibilityLevel: VisibilityLevel;
  starCount: number;
  downloadCount: number;
  updatedAt: string;
}

export interface ReviewItem {
  reviewID: string;
  skillID: string;
  skillDisplayName: string;
  submitterName: string;
  submitterDepartmentName: string;
  reviewType: ReviewType;
  reviewStatus: ReviewStatus;
  riskLevel: RiskLevel;
  summary: string;
  lockState: "unlocked" | "locked";
  currentReviewerName?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ReviewHistory {
  historyID: string;
  action: string;
  actorName: string;
  comment: string | null;
  createdAt: string;
}

export interface ReviewDetail extends ReviewItem {
  description: string;
  reviewSummary?: string;
  history: ReviewHistory[];
}
