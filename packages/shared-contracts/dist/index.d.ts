export type ISODateTimeString = string;
export type SemVerString = string;
export type SkillID = string;
export type UserID = string;
export type DepartmentID = string;
export type DeviceID = string;
export declare const SkillStatus: {
    readonly Published: "published";
    readonly Delisted: "delisted";
    readonly Archived: "archived";
};
export type SkillStatus = (typeof SkillStatus)[keyof typeof SkillStatus];
export declare const VisibilityLevel: {
    readonly Private: "private";
    readonly SummaryVisible: "summary_visible";
    readonly DetailVisible: "detail_visible";
    readonly PublicInstallable: "public_installable";
};
export type VisibilityLevel = (typeof VisibilityLevel)[keyof typeof VisibilityLevel];
export declare const DetailAccess: {
    readonly None: "none";
    readonly Summary: "summary";
    readonly Full: "full";
};
export type DetailAccess = (typeof DetailAccess)[keyof typeof DetailAccess];
export declare const RiskLevel: {
    readonly Low: "low";
    readonly Medium: "medium";
    readonly High: "high";
    readonly Unknown: "unknown";
};
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];
export declare const InstallState: {
    readonly NotInstalled: "not_installed";
    readonly Installed: "installed";
    readonly Enabled: "enabled";
    readonly UpdateAvailable: "update_available";
    readonly Blocked: "blocked";
};
export type InstallState = (typeof InstallState)[keyof typeof InstallState];
export declare const LocalStatus: {
    readonly Installed: "installed";
    readonly Enabled: "enabled";
    readonly PartiallyFailed: "partially_failed";
};
export type LocalStatus = (typeof LocalStatus)[keyof typeof LocalStatus];
export declare const ConnectionStatus: {
    readonly Connected: "connected";
    readonly Connecting: "connecting";
    readonly Offline: "offline";
    readonly Failed: "failed";
};
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];
export declare const TargetType: {
    readonly Tool: "tool";
    readonly Project: "project";
};
export type TargetType = (typeof TargetType)[keyof typeof TargetType];
export declare const AdapterStatus: {
    readonly Detected: "detected";
    readonly Manual: "manual";
    readonly Missing: "missing";
    readonly Invalid: "invalid";
    readonly Disabled: "disabled";
};
export type AdapterStatus = (typeof AdapterStatus)[keyof typeof AdapterStatus];
export declare const InstallMode: {
    readonly Symlink: "symlink";
    readonly Copy: "copy";
};
export type InstallMode = (typeof InstallMode)[keyof typeof InstallMode];
export type RequestedMode = InstallMode;
export type ResolvedMode = InstallMode;
export declare const NotificationType: {
    readonly SkillUpdateAvailable: "skill_update_available";
    readonly SkillScopeRestricted: "skill_scope_restricted";
    readonly LocalCopyBlocked: "local_copy_blocked";
    readonly ConnectionRestored: "connection_restored";
    readonly ConnectionFailed: "connection_failed";
    readonly TargetPathInvalid: "target_path_invalid";
    readonly InstallResult: "install_result";
    readonly UpdateResult: "update_result";
    readonly UninstallResult: "uninstall_result";
    readonly EnableResult: "enable_result";
    readonly DisableResult: "disable_result";
};
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export declare const ApiErrorCode: {
    readonly Unauthenticated: "unauthenticated";
    readonly PermissionDenied: "permission_denied";
    readonly SkillNotFound: "skill_not_found";
    readonly SkillDelisted: "skill_delisted";
    readonly ScopeRestricted: "scope_restricted";
    readonly PackageUnavailable: "package_unavailable";
    readonly PackageTooLarge: "package_too_large";
    readonly PackageFileCountExceeded: "package_file_count_exceeded";
    readonly HashMismatch: "hash_mismatch";
    readonly ConversionFailed: "conversion_failed";
    readonly ServerUnavailable: "server_unavailable";
};
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
export declare const NavigationItem: {
    readonly Home: "home";
    readonly Market: "market";
    readonly MyInstalled: "my_installed";
    readonly Tools: "tools";
    readonly Projects: "projects";
    readonly Notifications: "notifications";
    readonly Settings: "settings";
};
export type NavigationItem = (typeof NavigationItem)[keyof typeof NavigationItem];
export declare const SortOption: {
    readonly Composite: "composite";
    readonly LatestPublished: "latest_published";
    readonly RecentlyUpdated: "recently_updated";
    readonly DownloadCount: "download_count";
    readonly StarCount: "star_count";
    readonly Relevance: "relevance";
};
export type SortOption = (typeof SortOption)[keyof typeof SortOption];
export declare const AccessScope: {
    readonly AuthorizedOnly: "authorized_only";
    readonly IncludePublic: "include_public";
};
export type AccessScope = (typeof AccessScope)[keyof typeof AccessScope];
export declare const DetectionMethod: {
    readonly Registry: "registry";
    readonly DefaultPath: "default_path";
    readonly Manual: "manual";
};
export type DetectionMethod = (typeof DetectionMethod)[keyof typeof DetectionMethod];
export declare const LocalEventResult: {
    readonly Success: "success";
    readonly Failed: "failed";
};
export type LocalEventResult = (typeof LocalEventResult)[keyof typeof LocalEventResult];
export declare const EnabledTargetStatus: {
    readonly Enabled: "enabled";
    readonly Disabled: "disabled";
    readonly Failed: "failed";
};
export type EnabledTargetStatus = (typeof EnabledTargetStatus)[keyof typeof EnabledTargetStatus];
export interface PaginatedResponse<TItem> {
    readonly items: readonly TItem[];
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly hasMore: boolean;
}
export interface PaginationQuery {
    readonly page?: number;
    readonly pageSize?: number;
}
export interface ApiErrorBody<TDetail = unknown> {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly detail: TDetail | null;
    readonly retryable: boolean;
}
export interface ApiErrorResponse<TDetail = unknown> {
    readonly error: ApiErrorBody<TDetail>;
}
export interface CurrentUser {
    readonly userID: UserID;
    readonly displayName: string;
    readonly role: string;
    readonly departmentID: DepartmentID;
    readonly departmentName: string;
    readonly locale: string;
}
export interface ConnectionInfo {
    readonly status: ConnectionStatus;
    readonly serverTime: ISODateTimeString;
    readonly apiVersion: string;
}
export interface FeatureFlags {
    readonly p1Desktop: boolean;
    readonly publishSkill: false;
    readonly reviewWorkbench: false;
    readonly adminManage: false;
    readonly mcpManage: false;
    readonly pluginManage: false;
}
export interface BootstrapCounts {
    readonly installedCount: number;
    readonly updateAvailableCount: number;
    readonly unreadNotificationCount: number;
}
export interface DesktopBootstrapResponse {
    readonly user: CurrentUser;
    readonly connection: ConnectionInfo;
    readonly features: FeatureFlags;
    readonly counts: BootstrapCounts;
    readonly navigation: readonly NavigationItem[];
}
export interface LoginRequest {
    readonly username: string;
    readonly password: string;
}
export interface LoginResponse {
    readonly accessToken: string;
    readonly user: CurrentUser;
    readonly expiresAt: ISODateTimeString;
}
export interface SkillSummary {
    readonly skillID: SkillID;
    readonly displayName: string;
    readonly description: string;
    readonly version: SemVerString;
    readonly status: SkillStatus;
    readonly visibilityLevel: VisibilityLevel;
    readonly detailAccess: DetailAccess;
    readonly canInstall: boolean;
    readonly cannotInstallReason?: ApiErrorCode;
    readonly installState: InstallState;
    readonly authorName?: string;
    readonly authorDepartment?: string;
    readonly currentVersionUpdatedAt: ISODateTimeString;
    readonly compatibleTools: readonly string[];
    readonly compatibleSystems: readonly string[];
    readonly icon?: string;
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly starCount: number;
    readonly downloadCount: number;
    readonly riskLevel?: RiskLevel;
}
export interface SkillVersionSummary {
    readonly version: SemVerString;
    readonly publishedAt: ISODateTimeString;
    readonly changelog?: string;
    readonly riskLevel?: RiskLevel;
}
export interface EnabledTarget {
    readonly targetType: TargetType;
    readonly targetID: string;
    readonly targetName: string;
    readonly targetPath: string;
    readonly installMode: InstallMode;
    readonly requestedMode: RequestedMode;
    readonly resolvedMode: ResolvedMode;
    readonly fallbackReason?: string;
    readonly enabledAt: ISODateTimeString;
    readonly status: EnabledTargetStatus;
    readonly lastError?: string;
}
export interface SkillDetail extends SkillSummary {
    readonly readme?: string;
    readonly usage?: string;
    readonly screenshots?: readonly string[];
    readonly reviewSummary?: string;
    readonly riskDescription?: string;
    readonly versions?: readonly SkillVersionSummary[];
    readonly enabledTargets: readonly EnabledTarget[];
    readonly latestVersion: SemVerString;
    readonly hasUpdate: boolean;
    readonly canUpdate: boolean;
}
export interface ListSkillsQuery extends PaginationQuery {
    readonly q?: string;
    readonly departmentID?: DepartmentID;
    readonly compatibleTool?: string;
    readonly installed?: boolean;
    readonly enabled?: boolean;
    readonly accessScope?: AccessScope;
    readonly category?: string;
    readonly riskLevel?: RiskLevel;
    readonly sort?: SortOption;
}
export interface DownloadTicketRequest {
    readonly purpose: "install" | "update";
    readonly targetVersion: SemVerString;
    readonly localVersion: SemVerString | null;
}
export interface DownloadTicketResponse {
    readonly skillID: SkillID;
    readonly version: SemVerString;
    readonly packageRef: string;
    readonly packageURL: string;
    readonly packageHash: `sha256:${string}`;
    readonly packageSize: number;
    readonly packageFileCount: number;
    readonly expiresAt: ISODateTimeString;
}
export interface StarResponse {
    readonly skillID: SkillID;
    readonly starred: boolean;
    readonly starCount: number;
}
export interface Notification {
    readonly notificationID: string;
    readonly type: NotificationType;
    readonly title: string;
    readonly summary: string;
    readonly objectType?: "skill" | "tool" | "project" | "connection";
    readonly objectID?: string;
    readonly createdAt: ISODateTimeString;
    readonly read: boolean;
    readonly action?: string;
}
export interface ListNotificationsQuery extends PaginationQuery {
    readonly unreadOnly?: boolean;
}
export interface MarkNotificationsReadRequest {
    readonly notificationIDs?: readonly string[];
    readonly all: boolean;
}
export interface MarkNotificationsReadResponse {
    readonly unreadNotificationCount: number;
}
export interface LocalEvent {
    readonly eventID: string;
    readonly eventType: NotificationType;
    readonly skillID: SkillID;
    readonly version: SemVerString;
    readonly targetType: TargetType;
    readonly targetID: string;
    readonly targetPath: string;
    readonly requestedMode: RequestedMode;
    readonly resolvedMode: ResolvedMode;
    readonly fallbackReason?: string;
    readonly occurredAt: ISODateTimeString;
    readonly result: LocalEventResult;
}
export interface LocalEventsRequest {
    readonly deviceID: DeviceID;
    readonly events: readonly LocalEvent[];
}
export interface RejectedLocalEvent {
    readonly eventID: string;
    readonly code: ApiErrorCode;
    readonly message: string;
}
export interface RemoteNotice {
    readonly skillID: SkillID;
    readonly noticeType: NotificationType;
    readonly message: string;
}
export interface LocalEventsResponse {
    readonly acceptedEventIDs: readonly string[];
    readonly rejectedEvents: readonly RejectedLocalEvent[];
    readonly serverStateChanged: boolean;
    readonly remoteNotices: readonly RemoteNotice[];
}
export interface LocalSkillInstall {
    readonly skillID: SkillID;
    readonly displayName: string;
    readonly localVersion: SemVerString;
    readonly localHash: string;
    readonly sourcePackageHash: `sha256:${string}`;
    readonly installedAt: ISODateTimeString;
    readonly updatedAt: ISODateTimeString;
    readonly localStatus: LocalStatus;
    readonly centralStorePath: string;
    readonly enabledTargets: readonly EnabledTarget[];
    readonly hasUpdate: boolean;
    readonly isScopeRestricted: boolean;
    readonly canUpdate: boolean;
}
export interface ToolConfig {
    readonly toolID: string;
    readonly displayName: string;
    readonly adapterStatus: AdapterStatus;
    readonly detectedPath?: string;
    readonly configuredPath?: string;
    readonly skillsPath: string;
    readonly enabled: boolean;
    readonly detectionMethod: DetectionMethod;
    readonly transformStrategy: string;
    readonly lastScannedAt?: ISODateTimeString;
}
export interface ProjectConfig {
    readonly projectID: string;
    readonly displayName: string;
    readonly projectPath: string;
    readonly skillsPath: string;
    readonly enabled: boolean;
    readonly createdAt: ISODateTimeString;
    readonly updatedAt: ISODateTimeString;
}
export interface LocalBootstrapResponse {
    readonly installs: readonly LocalSkillInstall[];
    readonly tools: readonly ToolConfig[];
    readonly projects: readonly ProjectConfig[];
    readonly pendingOfflineEventCount: number;
    readonly unreadLocalNotificationCount: number;
    readonly centralStorePath: string;
}
export interface ScanToolsRequest {
    readonly toolIDs?: readonly string[];
}
export interface ValidateTargetPathRequest {
    readonly targetPath: string;
}
export interface ValidateTargetPathResponse {
    readonly valid: boolean;
    readonly writable: boolean;
    readonly reason?: string;
}
export interface InstallSkillPackageRequest {
    readonly downloadTicket: DownloadTicketResponse;
}
export interface UpdateSkillPackageRequest {
    readonly downloadTicket: DownloadTicketResponse;
}
export interface EnableSkillRequest {
    readonly skillID: SkillID;
    readonly version: SemVerString;
    readonly targetType: TargetType;
    readonly targetID: string;
    readonly preferredMode?: RequestedMode;
}
export interface DisableSkillRequest {
    readonly skillID: SkillID;
    readonly targetType: TargetType;
    readonly targetID: string;
}
export interface UninstallSkillRequest {
    readonly skillID: SkillID;
}
export interface UninstallSkillResponse {
    readonly skillID: SkillID;
    readonly removedCentralStorePath: boolean;
    readonly removedTargets: readonly EnabledTarget[];
    readonly failedTargets: readonly EnabledTarget[];
}
export interface FlushOfflineEventsRequest {
    readonly serverBaseURL: string;
    readonly accessToken: string;
    readonly deviceID: DeviceID;
}
export interface FlushOfflineEventsResponse extends LocalEventsResponse {
    readonly remainingQueuedEventCount: number;
}
export interface LocalCommandRequestMap {
    readonly get_local_bootstrap: undefined;
    readonly scan_tools: ScanToolsRequest;
    readonly validate_target_path: ValidateTargetPathRequest;
    readonly install_skill_package: InstallSkillPackageRequest;
    readonly update_skill_package: UpdateSkillPackageRequest;
    readonly enable_skill: EnableSkillRequest;
    readonly disable_skill: DisableSkillRequest;
    readonly uninstall_skill: UninstallSkillRequest;
    readonly flush_offline_events: FlushOfflineEventsRequest;
}
export interface LocalCommandResponseMap {
    readonly get_local_bootstrap: LocalBootstrapResponse;
    readonly scan_tools: readonly ToolConfig[];
    readonly validate_target_path: ValidateTargetPathResponse;
    readonly install_skill_package: LocalSkillInstall;
    readonly update_skill_package: LocalSkillInstall;
    readonly enable_skill: EnabledTarget;
    readonly disable_skill: EnabledTarget;
    readonly uninstall_skill: UninstallSkillResponse;
    readonly flush_offline_events: FlushOfflineEventsResponse;
}
export type LocalCommandName = keyof LocalCommandRequestMap;
export declare const LOCAL_COMMAND_NAMES: readonly ["get_local_bootstrap", "scan_tools", "validate_target_path", "install_skill_package", "update_skill_package", "enable_skill", "disable_skill", "uninstall_skill", "flush_offline_events"];
export declare const P1_API_ROUTES: {
    readonly authLogin: "/auth/login";
    readonly authLogout: "/auth/logout";
    readonly desktopBootstrap: "/desktop/bootstrap";
    readonly desktopLocalEvents: "/desktop/local-events";
    readonly skills: "/skills";
    readonly skillDetail: "/skills/:skillID";
    readonly skillDownloadTicket: "/skills/:skillID/download-ticket";
    readonly skillStar: "/skills/:skillID/star";
    readonly notifications: "/notifications";
    readonly notificationsMarkRead: "/notifications/mark-read";
};
export type P1ApiRouteName = keyof typeof P1_API_ROUTES;
//# sourceMappingURL=index.d.ts.map