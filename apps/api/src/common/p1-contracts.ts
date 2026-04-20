import type {
  AdminSkillDto as SharedAdminSkillDto,
  AdminUserDto as SharedAdminUserDto,
  BootstrapContextDto as SharedBootstrapContextDto,
  DepartmentNodeDto as SharedDepartmentNodeDto,
  DownloadTicketResponse as SharedDownloadTicketResponse,
  ErrorCode as SharedErrorCode,
  LocalEventDto as SharedLocalEventDto,
  MenuPermission as SharedMenuPermission,
  NotificationDto as SharedNotificationDto,
  PackageFileContentDto as SharedPackageFileContentDto,
  PackageFileEntryDto as SharedPackageFileEntryDto,
  PageQuery as SharedPageQuery,
  PageResponse as SharedPageResponse,
  PublisherSkillSummaryDto as SharedPublisherSkillSummaryDto,
  PublisherSubmissionDetailDto as SharedPublisherSubmissionDetailDto,
  ReviewAction as SharedReviewAction,
  ReviewDecision as SharedReviewDecision,
  ReviewDetailDto as SharedReviewDetailDto,
  ReviewHistoryDto as SharedReviewHistoryDto,
  ReviewItemDto as SharedReviewItemDto,
  ReviewPrecheckItemDto as SharedReviewPrecheckItemDto,
  ReviewStatus as SharedReviewStatus,
  ReviewType as SharedReviewType,
  SkillDetail as SharedSkillDetail,
  SkillLeaderboardItem as SharedSkillLeaderboardItem,
  SkillLeaderboardsResponse as SharedSkillLeaderboardsResponse,
  SkillStatus as SharedSkillStatus,
  SkillSummary as SharedSkillSummary,
  UserSummary as SharedUserSummary,
  VisibilityLevel as SharedVisibilityLevel,
  DetailAccess as SharedDetailAccess,
  RiskLevel as SharedRiskLevel,
  InstallState as SharedInstallState,
  ConnectionStatus as SharedConnectionStatus,
  TargetType as SharedTargetType,
  RequestedMode as SharedRequestedMode,
  ResolvedMode as SharedResolvedMode,
  NotificationType as SharedNotificationType,
  WorkflowState as SharedWorkflowState,
  PublishScopeType as SharedPublishScopeType,
  SubmissionType as SharedSubmissionType,
  PublisherStatusAction as SharedPublisherStatusAction,
  PackagePreviewFileType as SharedPackagePreviewFileType
} from "@enterprise-agent-hub/shared-contracts";

type MutableDeep<T> = T extends readonly (infer TItem)[]
  ? MutableDeep<TItem>[]
  : T extends object
    ? { -readonly [K in keyof T]: MutableDeep<T[K]> }
    : T;

export type ErrorCode = SharedErrorCode;
export type SkillStatus = SharedSkillStatus;
export type VisibilityLevel = SharedVisibilityLevel;
export type DetailAccess = SharedDetailAccess;
export type RiskLevel = SharedRiskLevel;
export type InstallState = SharedInstallState;
export type ConnectionStatus = SharedConnectionStatus;
export type TargetType = SharedTargetType;
export type RequestedMode = SharedRequestedMode;
export type ResolvedMode = SharedResolvedMode;
export type MenuPermission = SharedMenuPermission;
export type NotificationType = SharedNotificationType;
export type ReviewStatus = SharedReviewStatus;
export type ReviewType = SharedReviewType;
export type WorkflowState = SharedWorkflowState;
export type PublishScopeType = SharedPublishScopeType;
export type SubmissionType = SharedSubmissionType;
export type ReviewDecision = SharedReviewDecision;
export type ReviewAction = SharedReviewAction;
export type PublisherStatusAction = SharedPublisherStatusAction;
export type PackagePreviewFileType = SharedPackagePreviewFileType;
export type PageQuery = MutableDeep<SharedPageQuery>;
export type PageResponse<T> = MutableDeep<SharedPageResponse<T>>;
export type UserSummary = MutableDeep<SharedUserSummary>;
export type SkillSummary = MutableDeep<SharedSkillSummary>;
export type SkillDetail = MutableDeep<SharedSkillDetail>;
export type SkillLeaderboardItem = MutableDeep<SharedSkillLeaderboardItem>;
export type SkillLeaderboardsResponse = MutableDeep<SharedSkillLeaderboardsResponse>;
export type DownloadTicketResponse = MutableDeep<SharedDownloadTicketResponse>;
export type NotificationDto = MutableDeep<SharedNotificationDto>;
export type LocalEventDto = MutableDeep<SharedLocalEventDto>;
export type DepartmentNodeDto = MutableDeep<SharedDepartmentNodeDto>;
export type AdminUserDto = MutableDeep<SharedAdminUserDto>;
export type AdminSkillDto = MutableDeep<SharedAdminSkillDto>;
export type ReviewHistoryDto = MutableDeep<SharedReviewHistoryDto>;
export type ReviewPrecheckItemDto = MutableDeep<SharedReviewPrecheckItemDto>;
export type PackageFileEntryDto = MutableDeep<SharedPackageFileEntryDto>;
export type PackageFileContentDto = MutableDeep<SharedPackageFileContentDto>;
export type ReviewItemDto = MutableDeep<SharedReviewItemDto>;
export type ReviewDetailDto = MutableDeep<SharedReviewDetailDto>;
export type PublisherSkillSummaryDto = MutableDeep<SharedPublisherSkillSummaryDto>;
export type PublisherSubmissionDetailDto = MutableDeep<SharedPublisherSubmissionDetailDto>;
export type BootstrapContextDto = MutableDeep<SharedBootstrapContextDto>;

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    detail: unknown;
    retryable: boolean;
  };
}

export function pageOf<T>(items: T[], page: number, pageSize: number, total = items.length): PageResponse<T> {
  return {
    items: items as MutableDeep<T>[],
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total
  };
}

export function errorBody(code: ErrorCode, message: string, retryable = false, detail: unknown = null): ApiErrorBody {
  return {
    error: {
      code,
      message,
      detail,
      retryable
    }
  };
}
