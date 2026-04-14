import type {
  PackageFileEntryDto,
  PublisherSubmissionDetailDto,
  ReviewDetailDto,
  ReviewHistoryDto,
  ReviewItemDto
} from "../common/p1-contracts";
import { buildAvailableActions, effectiveReviewStatus, isLockActive } from "./publishing-review-policy";

export interface ReviewItemSource {
  review_id: string;
  skill_id: string;
  skill_display_name: string;
  submitter_name: string;
  submitter_department_name: string;
  review_type: ReviewItemDto["reviewType"];
  review_status: ReviewItemDto["reviewStatus"];
  workflow_state: ReviewItemDto["workflowState"];
  risk_level: ReviewItemDto["riskLevel"];
  summary: string;
  lock_owner_id: string | null;
  current_reviewer_name: string | null;
  lock_expires_at: Date | null;
  requested_version: string | null;
  requested_visibility_level: ReviewItemDto["requestedVisibilityLevel"] | null;
  requested_scope_type: ReviewItemDto["requestedScopeType"] | null;
  decision: ReviewItemDto["decision"] | null;
  submitted_at: Date;
  updated_at: Date;
}

export interface ReviewDetailSource extends ReviewItemSource {
  description: string;
  review_summary: string | null;
  current_version: string | null;
  current_visibility_level: ReviewDetailDto["currentVisibilityLevel"] | null;
  current_scope_type: ReviewDetailDto["currentScopeType"] | null;
  requested_department_ids: string[] | null;
  precheck_results: ReviewDetailDto["precheckResults"] | null;
  staged_package_object_key: string | null;
  current_package_id: string | null;
  staged_package_sha256: string | null;
  current_package_hash: string | null;
  staged_package_size_bytes: number | null;
  current_package_size_bytes: number | null;
  staged_package_file_count: number | null;
  current_package_file_count: number | null;
}

export interface PublisherSubmissionSource extends ReviewDetailSource {
  submission_payload: {
    description?: string;
    changelog?: string;
  };
}

export function mapReviewItem(review: ReviewItemSource, actorUserID: string): ReviewItemDto {
  return {
    reviewID: review.review_id,
    skillID: review.skill_id,
    skillDisplayName: review.skill_display_name,
    submitterName: review.submitter_name,
    submitterDepartmentName: review.submitter_department_name,
    reviewType: review.review_type,
    reviewStatus: effectiveReviewStatus(review),
    workflowState: review.workflow_state,
    riskLevel: review.risk_level,
    summary: review.summary,
    lockState: isLockActive(review.lock_expires_at) ? "locked" : "unlocked",
    lockOwnerID: isLockActive(review.lock_expires_at) ? review.lock_owner_id ?? undefined : undefined,
    currentReviewerName: isLockActive(review.lock_expires_at) ? review.current_reviewer_name ?? undefined : undefined,
    requestedVersion: review.requested_version ?? undefined,
    requestedVisibilityLevel: review.requested_visibility_level ?? undefined,
    requestedScopeType: review.requested_scope_type ?? undefined,
    decision: review.decision ?? undefined,
    availableActions: buildAvailableActions(review, actorUserID),
    submittedAt: review.submitted_at.toISOString(),
    updatedAt: review.updated_at.toISOString()
  };
}

export function buildReviewDetailDto(
  review: ReviewDetailSource,
  actorUserID: string,
  history: ReviewHistoryDto[],
  packageFiles: PackageFileEntryDto[],
  packageURL?: string
): ReviewDetailDto {
  const packageRef = review.staged_package_object_key ? review.review_id : review.current_package_id ?? undefined;
  return {
    ...mapReviewItem(review, actorUserID),
    description: review.description,
    reviewSummary: review.review_summary ?? undefined,
    currentVersion: review.current_version ?? undefined,
    currentVisibilityLevel: review.current_visibility_level ?? undefined,
    currentScopeType: review.current_scope_type ?? undefined,
    requestedDepartmentIDs: review.requested_department_ids ?? [],
    precheckResults: review.precheck_results ?? [],
    packageRef,
    packageURL,
    packageHash: review.staged_package_sha256 ?? review.current_package_hash ?? undefined,
    packageSize: review.staged_package_size_bytes ?? review.current_package_size_bytes ?? undefined,
    packageFileCount: review.staged_package_file_count ?? review.current_package_file_count ?? undefined,
    packageFiles,
    history
  };
}

export function buildPublisherSubmissionDetailDto(
  review: PublisherSubmissionSource,
  history: ReviewHistoryDto[],
  packageFiles: PackageFileEntryDto[],
  canWithdraw: boolean,
  packageURL?: string
): PublisherSubmissionDetailDto {
  const payload = review.submission_payload;
  const packageRef = review.staged_package_object_key ? review.review_id : review.current_package_id ?? undefined;
  return {
    submissionID: review.review_id,
    submissionType: review.review_type,
    workflowState: review.workflow_state,
    reviewStatus: effectiveReviewStatus(review),
    decision: review.decision ?? undefined,
    skillID: review.skill_id,
    displayName: review.skill_display_name,
    description: payload.description || review.description,
    changelog: payload.changelog ?? "",
    version: review.requested_version ?? review.current_version ?? "",
    currentVersion: review.current_version ?? undefined,
    visibilityLevel: review.requested_visibility_level ?? review.current_visibility_level ?? "private",
    currentVisibilityLevel: review.current_visibility_level ?? undefined,
    scopeType: review.requested_scope_type ?? review.current_scope_type ?? "current_department",
    currentScopeType: review.current_scope_type ?? undefined,
    selectedDepartmentIDs: review.requested_department_ids ?? [],
    reviewSummary: review.review_summary ?? undefined,
    precheckResults: review.precheck_results ?? [],
    packageRef,
    packageURL,
    packageHash: review.staged_package_sha256 ?? review.current_package_hash ?? undefined,
    packageSize: review.staged_package_size_bytes ?? review.current_package_size_bytes ?? undefined,
    packageFileCount: review.staged_package_file_count ?? review.current_package_file_count ?? undefined,
    packageFiles,
    submittedAt: review.submitted_at.toISOString(),
    updatedAt: review.updated_at.toISOString(),
    canWithdraw,
    history
  };
}
