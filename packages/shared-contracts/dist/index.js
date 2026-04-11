export const SkillStatus = {
    Published: "published",
    Delisted: "delisted",
    Archived: "archived"
};
export const VisibilityLevel = {
    Private: "private",
    SummaryVisible: "summary_visible",
    DetailVisible: "detail_visible",
    PublicInstallable: "public_installable"
};
export const DetailAccess = {
    None: "none",
    Summary: "summary",
    Full: "full"
};
export const RiskLevel = {
    Low: "low",
    Medium: "medium",
    High: "high",
    Unknown: "unknown"
};
export const InstallState = {
    NotInstalled: "not_installed",
    Installed: "installed",
    Enabled: "enabled",
    UpdateAvailable: "update_available",
    Blocked: "blocked"
};
export const LocalStatus = {
    Installed: "installed",
    Enabled: "enabled",
    PartiallyFailed: "partially_failed"
};
export const ConnectionStatus = {
    Connected: "connected",
    Connecting: "connecting",
    Offline: "offline",
    Failed: "failed"
};
export const TargetType = {
    Tool: "tool",
    Project: "project"
};
export const AdapterStatus = {
    Detected: "detected",
    Manual: "manual",
    Missing: "missing",
    Invalid: "invalid",
    Disabled: "disabled"
};
export const InstallMode = {
    Symlink: "symlink",
    Copy: "copy"
};
export const NotificationType = {
    SkillUpdateAvailable: "skill_update_available",
    SkillScopeRestricted: "skill_scope_restricted",
    LocalCopyBlocked: "local_copy_blocked",
    ConnectionRestored: "connection_restored",
    ConnectionFailed: "connection_failed",
    TargetPathInvalid: "target_path_invalid",
    InstallResult: "install_result",
    UpdateResult: "update_result",
    UninstallResult: "uninstall_result",
    EnableResult: "enable_result",
    DisableResult: "disable_result"
};
export const ApiErrorCode = {
    Unauthenticated: "unauthenticated",
    PermissionDenied: "permission_denied",
    SkillNotFound: "skill_not_found",
    SkillDelisted: "skill_delisted",
    ScopeRestricted: "scope_restricted",
    PackageUnavailable: "package_unavailable",
    PackageTooLarge: "package_too_large",
    PackageFileCountExceeded: "package_file_count_exceeded",
    HashMismatch: "hash_mismatch",
    ConversionFailed: "conversion_failed",
    ServerUnavailable: "server_unavailable"
};
export const NavigationItem = {
    Home: "home",
    Market: "market",
    MyInstalled: "my_installed",
    Tools: "tools",
    Projects: "projects",
    Notifications: "notifications",
    Settings: "settings"
};
export const SortOption = {
    Composite: "composite",
    LatestPublished: "latest_published",
    RecentlyUpdated: "recently_updated",
    DownloadCount: "download_count",
    StarCount: "star_count",
    Relevance: "relevance"
};
export const AccessScope = {
    AuthorizedOnly: "authorized_only",
    IncludePublic: "include_public"
};
export const DetectionMethod = {
    Registry: "registry",
    DefaultPath: "default_path",
    Manual: "manual"
};
export const LocalEventResult = {
    Success: "success",
    Failed: "failed"
};
export const EnabledTargetStatus = {
    Enabled: "enabled",
    Disabled: "disabled",
    Failed: "failed"
};
export const LOCAL_COMMAND_NAMES = [
    "get_local_bootstrap",
    "scan_tools",
    "validate_target_path",
    "install_skill_package",
    "update_skill_package",
    "enable_skill",
    "disable_skill",
    "uninstall_skill",
    "flush_offline_events"
];
export const P1_API_ROUTES = {
    authLogin: "/auth/login",
    authLogout: "/auth/logout",
    desktopBootstrap: "/desktop/bootstrap",
    desktopLocalEvents: "/desktop/local-events",
    skills: "/skills",
    skillDetail: "/skills/:skillID",
    skillDownloadTicket: "/skills/:skillID/download-ticket",
    skillStar: "/skills/:skillID/star",
    notifications: "/notifications",
    notificationsMarkRead: "/notifications/mark-read"
};
