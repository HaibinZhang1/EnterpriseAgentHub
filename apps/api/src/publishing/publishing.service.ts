import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import {
  PackageFileContentDto,
  PackageFileEntryDto,
  PublishScopeType,
  PublisherStatusAction,
  PublisherSkillSummaryDto,
  PublisherSubmissionDetailDto,
  ReviewDecision,
  ReviewDetailDto,
  ReviewHistoryDto,
  ReviewItemDto,
  SkillStatus,
  SubmissionType,
  UserSummary,
  VisibilityLevel,
  WorkflowState,
} from '../common/p1-contracts';
import { logInfo } from '../common/structured-log';
import { DatabaseService } from '../database/database.service';
import { SkillsService } from '../skills/skills.service';
import { assertSkillStatusTransition } from '../admin/skill-status';
import {
  buildPrecheckItems,
  compareSemver,
  hasWarnings,
  isSemver,
  parseSimpleFrontmatter,
  readSkillMarkdown,
} from './publishing.utils';
import {
  buildPublisherSubmissionDetailDto,
  buildReviewDetailDto,
  mapReviewItem,
} from './publishing-review-mappers';
import {
  effectiveReviewStatus,
  publisherStatusActions,
} from './publishing-review-policy';
import { ReviewerRoutingService } from './reviewer-routing.service';
import { PackageStorageService } from './package-storage.service';
import { PublishingRepository } from './publishing.repository';
import type {
  ActorContext,
  ReviewRecord,
  SkillRecord,
  SubmissionInput,
  SubmissionPayload,
  UploadedSubmissionFile,
} from './publishing.types';
const execFileAsync = promisify(execFile);
const PRECHECK_QUEUE = 'publishing-precheck';
const REVIEW_LOCK_MS = 5 * 60 * 1000;

@Injectable()
export class PublishingService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private queue: Queue<{ reviewID: string }> | null = null;
  private worker: Worker<{ reviewID: string }> | null = null;

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly skillsService: SkillsService,
    private readonly publishingRepository: PublishingRepository,
    private readonly reviewerRouting: ReviewerRoutingService,
    private readonly packageStorage: PackageStorageService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      return;
    }

    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(PRECHECK_QUEUE, { connection: this.redis });
    this.worker = new Worker(
      PRECHECK_QUEUE,
      async (job) => {
        await this.processSystemPrecheck(job.data.reviewID);
      },
      { connection: this.redis },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.redis?.quit();
  }

  async listPublisherSkills(userID: string): Promise<PublisherSkillSummaryDto[]> {
    const actor = await this.publishingRepository.loadActor(userID);
    const skillRows = await this.database.query<SkillRecord>(
      `
      SELECT
        s.id,
        s.skill_id,
        s.display_name,
        s.description,
        s.author_id,
        s.department_id,
        s.status,
        s.visibility_level,
        s.category,
        v.version,
        s.current_version_id,
        p.id AS current_package_id,
        p.sha256 AS current_package_hash,
        p.size_bytes AS current_package_size_bytes,
        p.file_count AS current_package_file_count,
        auth.scope_type,
        auth.department_ids AS scope_department_ids,
        COALESCE(tools.compatible_tools, '{}') AS compatible_tools,
        COALESCE(systems.compatible_systems, '{}') AS compatible_systems,
        COALESCE(tags.tags, '{}') AS tags
      FROM skills s
      LEFT JOIN skill_versions v ON v.id = s.current_version_id
      LEFT JOIN skill_packages p ON p.skill_version_id = v.id
      LEFT JOIN LATERAL (
        SELECT scope_type, array_remove(array_agg(skill_authorizations.department_id ORDER BY skill_authorizations.department_id), NULL) AS department_ids
        FROM skill_authorizations
        WHERE skill_authorizations.skill_id = s.id
        GROUP BY scope_type
        ORDER BY count(*) DESC, scope_type ASC
        LIMIT 1
      ) auth ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(tool_id ORDER BY tool_id) AS compatible_tools
        FROM skill_tool_compatibilities
        WHERE skill_id = s.id
      ) tools ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(system ORDER BY system) AS compatible_systems
        FROM skill_tool_compatibilities
        WHERE skill_id = s.id
      ) systems ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(tag ORDER BY tag) AS tags
        FROM skill_tags
        WHERE skill_id = s.id
      ) tags ON true
      WHERE s.author_id = $1
      ORDER BY s.updated_at DESC
      `,
      [actor.userID],
    );

    const submissionRows = await this.database.query<ReviewRecord>(
      `
      SELECT DISTINCT ON (r.skill_id)
        r.id AS review_id,
        r.skill_id,
        r.skill_display_name,
        r.submitter_id,
        r.submitter_name,
        r.submitter_department_id,
        r.submitter_department_name,
        d.path AS submitter_department_path,
        d.parent_id AS submitter_parent_department_id,
        submitter.role AS submitter_role,
        submitter.admin_level AS submitter_admin_level,
        r.review_type,
        r.review_status,
        r.workflow_state,
        r.risk_level,
        r.summary,
        r.description,
        r.review_summary,
        reviewer.display_name AS current_reviewer_name,
        r.lock_owner_id,
        r.lock_expires_at,
        r.requested_version,
        r.requested_visibility_level,
        r.requested_scope_type,
        r.staged_package_bucket,
        r.staged_package_object_key,
        r.staged_package_sha256,
        r.staged_package_size_bytes,
        r.staged_package_file_count,
        r.decision,
        r.submission_payload,
        r.precheck_results,
        request_scope.department_ids AS requested_department_ids,
        s.version AS current_version,
        s.status AS current_status,
        s.visibility_level AS current_visibility_level,
        current_scope.scope_type AS current_scope_type,
        current_scope.department_ids AS current_scope_department_ids,
        current_package.id AS current_package_id,
        current_package.bucket AS current_package_bucket,
        current_package.object_key AS current_package_object_key,
        current_package.sha256 AS current_package_hash,
        current_package.size_bytes AS current_package_size_bytes,
        current_package.file_count AS current_package_file_count,
        r.submitted_at,
        r.updated_at
      FROM review_items r
      JOIN users submitter ON submitter.id = r.submitter_id
      JOIN departments d ON d.id = r.submitter_department_id
      LEFT JOIN users reviewer ON reviewer.id = r.lock_owner_id
      LEFT JOIN LATERAL (
        SELECT array_remove(array_agg(review_item_scope_departments.department_id ORDER BY review_item_scope_departments.department_id), NULL) AS department_ids
        FROM review_item_scope_departments
        WHERE review_item_id = r.id
      ) request_scope ON true
      LEFT JOIN LATERAL (
        SELECT
          skills.status,
          skills.visibility_level,
          versions.version
        FROM skills
        LEFT JOIN skill_versions versions ON versions.id = skills.current_version_id
        WHERE skills.skill_id = r.skill_id
        LIMIT 1
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT scope_type, array_remove(array_agg(sa.department_id ORDER BY sa.department_id), NULL) AS department_ids
        FROM skill_authorizations sa
        JOIN skills skill_scope ON skill_scope.id = sa.skill_id
        WHERE skill_scope.skill_id = r.skill_id
        GROUP BY scope_type
        ORDER BY count(*) DESC, scope_type ASC
        LIMIT 1
      ) current_scope ON true
      LEFT JOIN LATERAL (
        SELECT p.id, p.bucket, p.object_key, p.sha256, p.size_bytes, p.file_count
        FROM skills skill_pkg
        JOIN skill_versions version_pkg ON version_pkg.id = skill_pkg.current_version_id
        JOIN skill_packages p ON p.skill_version_id = version_pkg.id
        WHERE skill_pkg.skill_id = r.skill_id
        LIMIT 1
      ) current_package ON true
      WHERE r.submitter_id = $1
      ORDER BY r.skill_id ASC, r.updated_at DESC
      `,
      [actor.userID],
    );

    const submissionsBySkillID = new Map(submissionRows.rows.map((row) => [row.skill_id, row]));
    const summaries = new Map<string, PublisherSkillSummaryDto>();

    for (const row of skillRows.rows) {
      const latest = submissionsBySkillID.get(row.skill_id);
      summaries.set(row.skill_id, {
        skillID: row.skill_id,
        displayName: row.display_name,
        publishedSkillExists: true,
        currentVersion: row.version,
        currentStatus: row.status,
        currentVisibilityLevel: row.visibility_level,
        currentScopeType: row.scope_type,
        latestSubmissionID: latest?.review_id ?? null,
        latestSubmissionType: latest?.review_type ?? null,
        latestWorkflowState: latest?.workflow_state ?? null,
        latestReviewStatus: latest ? effectiveReviewStatus(latest) : null,
        latestDecision: latest?.decision ?? null,
        latestRequestedVersion: latest?.requested_version ?? null,
        latestRequestedVisibilityLevel: latest?.requested_visibility_level ?? null,
        latestRequestedScopeType: latest?.requested_scope_type ?? null,
        latestReviewSummary: latest?.review_summary ?? null,
        submittedAt: latest?.submitted_at?.toISOString() ?? null,
        updatedAt: (latest?.updated_at ?? new Date()).toISOString(),
        canWithdraw: latest ? this.reviewerRouting.canSubmitterWithdraw(actor.userID, latest) : false,
        availableStatusActions: publisherStatusActions(row.status),
      });
    }

    for (const row of submissionRows.rows) {
      if (summaries.has(row.skill_id)) {
        continue;
      }
      summaries.set(row.skill_id, {
        skillID: row.skill_id,
        displayName: row.skill_display_name,
        publishedSkillExists: false,
        currentVersion: row.current_version,
        currentStatus: row.current_status,
        currentVisibilityLevel: row.current_visibility_level,
        currentScopeType: row.current_scope_type,
        latestSubmissionID: row.review_id,
        latestSubmissionType: row.review_type,
        latestWorkflowState: row.workflow_state,
        latestReviewStatus: effectiveReviewStatus(row),
        latestDecision: row.decision ?? null,
        latestRequestedVersion: row.requested_version ?? null,
        latestRequestedVisibilityLevel: row.requested_visibility_level ?? null,
        latestRequestedScopeType: row.requested_scope_type ?? null,
        latestReviewSummary: row.review_summary ?? null,
        submittedAt: row.submitted_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        canWithdraw: this.reviewerRouting.canSubmitterWithdraw(actor.userID, row),
        availableStatusActions: [],
      });
    }

    return [...summaries.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getPublisherSubmission(userID: string, submissionID: string): Promise<PublisherSubmissionDetailDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(submissionID);
    if (review.submitter_id !== actor.userID) {
      throw new ForbiddenException('permission_denied');
    }

    const history = await this.publishingRepository.loadHistory(review.review_id);
    return this.toPublisherSubmissionDetail(review, history, actor.userID, actor.userID);
  }

  async submitSubmission(
    user: UserSummary,
    body: Record<string, string | undefined>,
    files: UploadedSubmissionFile[],
  ): Promise<PublisherSubmissionDetailDto> {
    const startedAt = Date.now();
    const actor = await this.publishingRepository.loadActor(user.userID);
    const input = this.parseSubmissionInput(body);
    const currentSkill = input.submissionType === 'publish' ? null : await this.publishingRepository.loadSkillByID(input.skillID);

    if (input.submissionType === 'publish' && currentSkill) {
      throw new BadRequestException('validation_failed');
    }
    if (input.submissionType !== 'publish') {
      if (!currentSkill) {
        throw new NotFoundException('skill_not_found');
      }
      if (currentSkill.author_id !== actor.userID) {
        throw new ForbiddenException('permission_denied');
      }
      if (currentSkill.status === 'archived') {
        throw new BadRequestException('validation_failed');
      }
    }

    if (input.submissionType === 'permission_change') {
      input.version = currentSkill?.version ?? input.version;
      if (files.length > 0) {
        throw new BadRequestException('validation_failed');
      }
    } else if (files.length === 0) {
      throw new BadRequestException('validation_failed');
    }

    const reviewID = `rv_${randomBytes(8).toString('hex')}`;
    const stagedPackage =
      input.submissionType === 'permission_change'
        ? null
        : await this.packageStorage.stageSubmissionPackage(reviewID, input, files);

    const requestedVisibility = input.visibilityLevel;
    const requestedScope = input.scopeType;
    const payload: SubmissionPayload = {
      description: input.description,
      changelog: input.changelog,
      category: input.category,
      tags: input.tags,
      compatibleTools: input.compatibleTools,
      compatibleSystems: input.compatibleSystems,
      packageSize: stagedPackage?.sizeBytes,
      packageFileCount: stagedPackage?.fileCount,
    };

    await this.database.transaction(async (client) => {
      await client.query(
        `
        INSERT INTO review_items (
          id,
          skill_id,
          skill_display_name,
          submitter_id,
          submitter_name,
          submitter_department_id,
          submitter_department_name,
          review_type,
          review_status,
          workflow_state,
          risk_level,
          summary,
          description,
          requested_version,
          requested_visibility_level,
          requested_scope_type,
          staged_package_bucket,
          staged_package_object_key,
          staged_package_sha256,
          staged_package_size_bytes,
          staged_package_file_count,
          staged_package_content_type,
          submission_payload,
          submitted_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'system_prechecking', 'unknown', $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, 'application/zip', $19::jsonb, now(), now()
        )
        `,
        [
          reviewID,
          input.skillID,
          input.displayName,
          actor.userID,
          actor.displayName,
          actor.departmentID,
          actor.departmentName,
          input.submissionType,
          buildSubmissionSummary(input),
          input.description,
          input.version,
          requestedVisibility,
          requestedScope,
          stagedPackage?.bucket ?? null,
          stagedPackage?.objectKey ?? null,
          stagedPackage?.sha256 ?? null,
          stagedPackage?.sizeBytes ?? null,
          stagedPackage?.fileCount ?? null,
          JSON.stringify(payload),
        ],
      );

      if (input.selectedDepartmentIDs.length > 0) {
        for (const departmentID of input.selectedDepartmentIDs) {
          await client.query(
            'INSERT INTO review_item_scope_departments (review_item_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [reviewID, departmentID],
          );
        }
      }

      await client.query(
        `
        INSERT INTO review_item_history (id, review_item_id, actor_id, action, comment, created_at)
        VALUES ($1, $2, $3, 'submitted', $4, now())
        `,
        [`rvh_${randomBytes(8).toString('hex')}`, reviewID, actor.userID, buildSubmissionSummary(input)],
      );
    });

    await this.enqueueSystemPrecheck(reviewID);
    logInfo({
      event: 'publishing.submission.created',
      domain: 'publisher-submission',
      action: 'submit_submission',
      actorID: actor.userID,
      entityID: reviewID,
      result: 'ok',
      durationMs: Date.now() - startedAt,
      detail: { skillID: input.skillID, submissionType: input.submissionType },
    });
    return this.getPublisherSubmission(actor.userID, reviewID);
  }

  async withdrawSubmission(userID: string, submissionID: string): Promise<PublisherSubmissionDetailDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(submissionID);
    if (review.submitter_id !== actor.userID || !this.reviewerRouting.canSubmitterWithdraw(actor.userID, review)) {
      throw new ForbiddenException('permission_denied');
    }

    await this.database.transaction(async (client) => {
      await client.query(
        `
        UPDATE review_items
        SET workflow_state = 'withdrawn',
            review_status = 'reviewed',
            decision = 'withdraw',
            lock_owner_id = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = $1
        `,
        [submissionID],
      );
      await this.publishingRepository.insertHistory(client, submissionID, actor.userID, 'withdrawn', '发布者已撤回提交。');
    });

    return this.getPublisherSubmission(actor.userID, submissionID);
  }

  async setPublisherSkillStatus(
    userID: string,
    skillID: string,
    nextStatus: PublisherStatusAction,
  ): Promise<PublisherSkillSummaryDto[]> {
    const actor = await this.publishingRepository.loadActor(userID);
    const skill = await this.publishingRepository.loadSkillByID(skillID);
    if (!skill || skill.author_id !== actor.userID) {
      throw new ForbiddenException('permission_denied');
    }

    const statusMap: Record<PublisherStatusAction, SkillStatus> = {
      delist: 'delisted',
      relist: 'published',
      archive: 'archived',
    };
    const targetStatus = statusMap[nextStatus];
    assertSkillStatusTransition(skill.status, targetStatus);

    await this.database.query(
      'UPDATE skills SET status = $2, updated_at = now() WHERE skill_id = $1',
      [skillID, targetStatus],
    );
    return this.listPublisherSkills(actor.userID);
  }

  async listPublisherSubmissionFiles(
    userID: string,
    submissionID: string,
  ): Promise<PackageFileEntryDto[]> {
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(submissionID);
    if (review.submitter_id !== actor.userID) {
      throw new ForbiddenException('permission_denied');
    }
    return this.packageStorage.listPackageFilesForReview(review);
  }

  async getPublisherSubmissionFileContent(
    userID: string,
    submissionID: string,
    relativePath: string,
  ): Promise<PackageFileContentDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(submissionID);
    if (review.submitter_id !== actor.userID) {
      throw new ForbiddenException('permission_denied');
    }
    return this.packageStorage.readPackageFileContentForReview(review, relativePath);
  }

  async listReviews(userID: string): Promise<ReviewItemDto[]> {
    const actor = await this.publishingRepository.loadActor(userID);
    if (actor.role !== 'admin' || actor.adminLevel === null) {
      throw new ForbiddenException('permission_denied');
    }

    const reviews = await this.publishingRepository.loadReviews();
    const items: ReviewItemDto[] = [];
    for (const review of reviews) {
      if (!(await this.reviewerRouting.canActorSeeReview(actor, review))) {
        continue;
      }
      items.push(this.toReviewItem(review, actor));
    }
    return items;
  }

  async getReview(userID: string, reviewID: string): Promise<ReviewDetailDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    if (actor.role !== 'admin' || actor.adminLevel === null) {
      throw new ForbiddenException('permission_denied');
    }

    const review = await this.publishingRepository.loadReview(reviewID);
    if (!(await this.reviewerRouting.canActorSeeReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }
    const history = await this.publishingRepository.loadHistory(reviewID);
    return this.toReviewDetail(review, history, actor, actor.userID);
  }

  async listReviewFiles(userID: string, reviewID: string): Promise<PackageFileEntryDto[]> {
    const actor = await this.publishingRepository.loadActor(userID);
    if (actor.role !== 'admin' || actor.adminLevel === null) {
      throw new ForbiddenException('permission_denied');
    }

    const review = await this.publishingRepository.loadReview(reviewID);
    if (!(await this.reviewerRouting.canActorSeeReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }
    return this.packageStorage.listPackageFilesForReview(review);
  }

  async getReviewFileContent(
    userID: string,
    reviewID: string,
    relativePath: string,
  ): Promise<PackageFileContentDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    if (actor.role !== 'admin' || actor.adminLevel === null) {
      throw new ForbiddenException('permission_denied');
    }

    const review = await this.publishingRepository.loadReview(reviewID);
    if (!(await this.reviewerRouting.canActorSeeReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }
    return this.packageStorage.readPackageFileContentForReview(review, relativePath);
  }

  async claimReview(userID: string, reviewID: string): Promise<ReviewDetailDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(reviewID);
    if (!(await this.reviewerRouting.canActorReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }

    await this.database.transaction(async (client) => {
      const claimResult = await client.query(
        `
        UPDATE review_items
        SET lock_owner_id = $2,
            lock_expires_at = $3,
            review_status = 'in_review',
            updated_at = now()
        WHERE id = $1
          AND workflow_state IN ('manual_precheck', 'pending_review')
          AND (
            lock_owner_id IS NULL
            OR lock_expires_at IS NULL
            OR lock_expires_at <= now()
            OR lock_owner_id = $2
          )
        `,
        [reviewID, actor.userID, new Date(Date.now() + REVIEW_LOCK_MS).toISOString()],
      );
      if (claimResult.rowCount !== 1) {
        throw new ForbiddenException('permission_denied');
      }
      await this.publishingRepository.insertHistory(client, reviewID, actor.userID, 'claimed', '审核员已领取当前单据。');
    });

    return this.getReview(actor.userID, reviewID);
  }

  async passPrecheck(userID: string, reviewID: string, comment: string): Promise<ReviewDetailDto> {
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(reviewID);
    this.reviewerRouting.assertClaimedReview(actor, review, 'manual_precheck');

    if (!(await this.reviewerRouting.canActorReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }

    const autoApprove = await this.reviewerRouting.shouldAutoApprove(review);
    if (autoApprove) {
      await this.publishSubmission(review, actor, comment || '系统初审复核通过并自动发布。');
    } else {
      await this.database.transaction(async (client) => {
        await client.query(
          `
          UPDATE review_items
          SET workflow_state = 'pending_review',
              review_status = 'pending',
              lock_owner_id = NULL,
              lock_expires_at = NULL,
              review_summary = COALESCE(NULLIF($2, ''), review_summary),
              updated_at = now()
          WHERE id = $1
          `,
          [reviewID, comment],
        );
        await this.publishingRepository.insertHistory(client, reviewID, actor.userID, 'pass_precheck', comment || '人工复核通过，进入管理员审核。');
      });
    }

    return this.getReview(actor.userID, reviewID);
  }

  async approveReview(userID: string, reviewID: string, comment: string): Promise<ReviewDetailDto> {
    const startedAt = Date.now();
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(reviewID);
    this.reviewerRouting.assertClaimedReview(actor, review, 'pending_review');
    if (!(await this.reviewerRouting.canActorReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }

    await this.publishSubmission(review, actor, comment || '审核通过，已发布。');
    logInfo({
      event: 'review.approved',
      domain: 'review-governance',
      action: 'approve_review',
      actorID: actor.userID,
      entityID: reviewID,
      result: 'ok',
      durationMs: Date.now() - startedAt,
    });
    return this.getReview(actor.userID, reviewID);
  }

  async returnReview(userID: string, reviewID: string, comment: string): Promise<ReviewDetailDto> {
    const startedAt = Date.now();
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(reviewID);
    this.reviewerRouting.assertClaimedReview(actor, review);
    if (!(await this.reviewerRouting.canActorReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }
    await this.finalizeReview(reviewID, actor.userID, 'returned_for_changes', 'return_for_changes', comment || '请补充修改后重新提交。');
    logInfo({
      event: 'review.returned',
      domain: 'review-governance',
      action: 'return_review',
      actorID: actor.userID,
      entityID: reviewID,
      result: 'ok',
      durationMs: Date.now() - startedAt,
    });
    return this.getReview(actor.userID, reviewID);
  }

  async rejectReview(userID: string, reviewID: string, comment: string): Promise<ReviewDetailDto> {
    const startedAt = Date.now();
    const actor = await this.publishingRepository.loadActor(userID);
    const review = await this.publishingRepository.loadReview(reviewID);
    this.reviewerRouting.assertClaimedReview(actor, review);
    if (!(await this.reviewerRouting.canActorReview(actor, review))) {
      throw new ForbiddenException('permission_denied');
    }
    await this.finalizeReview(reviewID, actor.userID, 'review_rejected', 'reject', comment || '审核拒绝。');
    logInfo({
      event: 'review.rejected',
      domain: 'review-governance',
      action: 'reject_review',
      actorID: actor.userID,
      entityID: reviewID,
      result: 'ok',
      durationMs: Date.now() - startedAt,
    });
    return this.getReview(actor.userID, reviewID);
  }

  async processSystemPrecheck(reviewID: string): Promise<void> {
    const review = await this.publishingRepository.loadReview(reviewID);
    if (review.workflow_state !== 'system_prechecking') {
      return;
    }

    await this.publishingRepository.recordJobRun(reviewID, 'running');
    const warnings: string[] = [];
    let hasSkillMd = true;
    let frontmatterNameMatches = true;
    let versionValid = isSemver(review.requested_version ?? '');
    let versionIncrementValid = true;
    const sizeValid = (review.staged_package_size_bytes ?? 0) <= 5 * 1024 * 1024 || review.review_type === 'permission_change';
    const fileCountValid = (review.staged_package_file_count ?? 0) <= 100 || review.review_type === 'permission_change';
    const visibilityValid = isVisibilityLevel(review.requested_visibility_level);
    const scopeValid = isScopeType(review.requested_scope_type);

    const currentSkill = review.current_version ? await this.publishingRepository.loadSkillByID(review.skill_id) : null;
    if (review.review_type === 'update' && currentSkill && review.requested_version) {
      versionIncrementValid = compareSemver(review.requested_version, currentSkill.version ?? '0.0.0') > 0;
    }

    if (review.review_type === 'permission_change') {
      versionValid = true;
      versionIncrementValid = true;
    }

    if (review.review_type !== 'permission_change') {
      const tempDir = await mkdtemp(join(tmpdir(), 'eah-precheck-'));
      try {
        const zipPath = join(tempDir, 'package.zip');
        const extractDir = join(tempDir, 'extract');
        await mkdir(extractDir, { recursive: true });
        const buffer = await this.packageStorage.readReviewPackageBuffer(review);
        await writeFile(zipPath, buffer);
        await this.unzipFile(zipPath, extractDir);
        const packageRoot = await this.resolvePackageRoot(extractDir);
        hasSkillMd = existsSync(join(packageRoot, 'SKILL.md'));
        if (hasSkillMd) {
          const frontmatter = parseSimpleFrontmatter(readSkillMarkdown(packageRoot));
          frontmatterNameMatches = !frontmatter.name || frontmatter.name === review.skill_id;
        } else {
          frontmatterNameMatches = false;
        }
      } catch (error) {
        hasSkillMd = false;
        frontmatterNameMatches = false;
        warnings.push(error instanceof Error ? error.message : '系统初审解包失败。');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    }

    if (review.review_type === 'publish' && currentSkill) {
      warnings.push('存在同名 Skill，需人工复核是否允许重建。');
    }
    if ((review.review_type === 'update' || review.review_type === 'permission_change') && !currentSkill) {
      warnings.push('目标 Skill 不存在，需人工复核。');
    }

    const items = buildPrecheckItems({
      hasSkillMd,
      frontmatterNameMatches,
      versionValid,
      versionIncrementValid,
      sizeValid,
      fileCountValid,
      visibilityValid,
      scopeValid,
      warnings,
    });
    const nextWorkflow = hasWarnings(items) ? 'manual_precheck' : 'pending_review';
    const autoApprove = !hasWarnings(items) && (await this.reviewerRouting.shouldAutoApprove(review));

    await this.database.transaction(async (client) => {
      await client.query(
        `
        UPDATE review_items
        SET precheck_results = $2::jsonb,
            workflow_state = $3,
            review_status = CASE WHEN $4 THEN 'reviewed' ELSE 'pending' END,
            updated_at = now()
        WHERE id = $1
        `,
        [reviewID, JSON.stringify(items), autoApprove ? 'published' : nextWorkflow, autoApprove],
      );
      await this.publishingRepository.insertHistory(
        client,
        reviewID,
        null,
        hasWarnings(items) ? 'manual_precheck' : 'system_precheck_passed',
        hasWarnings(items) ? '系统初审发现异常，转人工复核。' : '系统初审通过。',
      );
    });

    if (autoApprove) {
      const refreshed = await this.publishingRepository.loadReview(reviewID);
      await this.publishSubmission(refreshed, null, '系统初审通过，按管理员等级自动发布。');
    }
    await this.publishingRepository.recordJobRun(reviewID, 'finished');
  }

  private async finalizeReview(
    reviewID: string,
    actorUserID: string,
    workflowState: Extract<WorkflowState, 'returned_for_changes' | 'review_rejected'>,
    decision: Extract<ReviewDecision, 'return_for_changes' | 'reject'>,
    comment: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        `
        UPDATE review_items
        SET workflow_state = $2,
            review_status = 'reviewed',
            decision = $3,
            review_summary = $4,
            lock_owner_id = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = $1
        `,
        [reviewID, workflowState, decision, comment],
      );
      await this.publishingRepository.insertHistory(client, reviewID, actorUserID, decision, comment);
    });
  }

  private async publishSubmission(review: ReviewRecord, actor: ActorContext | null, comment: string): Promise<void> {
    const currentSkill = review.current_version ? await this.publishingRepository.loadSkillByID(review.skill_id) : null;
    await this.database.transaction(async (client) => {
      const payload = review.submission_payload ?? {
        description: review.description,
        changelog: '',
        category: 'uncategorized',
        tags: [],
        compatibleTools: [],
        compatibleSystems: [],
      };
      let skillID: string;
      let skillUUID: string;
      let publishedVersionID: string | null = currentSkill?.current_version_id ?? null;

      if (!currentSkill) {
        const insertedSkill = await client.query<{ id: string; skill_id: string }>(
          `
          INSERT INTO skills (
            skill_id,
            display_name,
            description,
            author_id,
            department_id,
            status,
            visibility_level,
            category,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, 'published', $6, $7, now())
          RETURNING id, skill_id
          `,
          [
            review.skill_id,
            review.skill_display_name,
            payload.description,
            review.submitter_id,
            review.submitter_department_id,
            review.requested_visibility_level ?? 'private',
            payload.category,
          ],
        );
        skillUUID = insertedSkill.rows[0].id;
        skillID = insertedSkill.rows[0].skill_id;
      } else {
        skillUUID = currentSkill.id;
        skillID = currentSkill.skill_id;
        await client.query(
          `
          UPDATE skills
          SET display_name = $2,
              description = $3,
              visibility_level = $4,
              category = $5,
              updated_at = now()
          WHERE id = $1
          `,
          [
            currentSkill.id,
            review.skill_display_name,
            payload.description,
            review.requested_visibility_level ?? currentSkill.visibility_level,
            payload.category,
          ],
        );
      }

      if (review.review_type !== 'permission_change') {
        const version = review.requested_version ?? review.current_version;
        if (!version || !review.staged_package_bucket || !review.staged_package_object_key || !review.staged_package_sha256) {
          throw new BadRequestException('validation_failed');
        }

        const finalObjectKey = `skills/${skillID}/${version}/package.zip`;
        await this.packageStorage.copyObject(
          review.staged_package_bucket,
          review.staged_package_object_key,
          this.packageStorage.packageBucket(),
          finalObjectKey,
        );
        const versionID = randomUUID();
        const packageID = `pkg_${skillID}_${version.replace(/\./g, '_')}_${randomBytes(4).toString('hex')}`;

        await client.query(
          `
          INSERT INTO skill_versions (
            id,
            skill_id,
            version,
            changelog,
            risk_level,
            review_summary,
            published_at
          )
          VALUES ($1, $2, $3, $4, 'unknown', $5, now())
          `,
          [versionID, skillUUID, version, payload.changelog, comment],
        );
        await client.query(
          `
          INSERT INTO skill_packages (
            id,
            skill_version_id,
            bucket,
            object_key,
            sha256,
            size_bytes,
            file_count,
            content_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'application/zip')
          `,
          [
            packageID,
            versionID,
            this.packageStorage.packageBucket(),
            finalObjectKey,
            review.staged_package_sha256,
            review.staged_package_size_bytes ?? payload.packageSize ?? 0,
            review.staged_package_file_count ?? payload.packageFileCount ?? 0,
          ],
        );
        await client.query('UPDATE skills SET current_version_id = $2 WHERE id = $1', [skillUUID, versionID]);
        publishedVersionID = versionID;
      }

      await client.query('DELETE FROM skill_tags WHERE skill_id = $1', [skillUUID]);
      for (const tag of payload.tags ?? []) {
        await client.query('INSERT INTO skill_tags (skill_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [skillUUID, tag]);
      }
      await client.query('DELETE FROM skill_tool_compatibilities WHERE skill_id = $1', [skillUUID]);
      const systems = payload.compatibleSystems.length > 0 ? payload.compatibleSystems : ['windows'];
      for (const toolID of payload.compatibleTools ?? []) {
        for (const system of systems) {
          await client.query(
            `
            INSERT INTO skill_tool_compatibilities (skill_id, tool_id, system)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            `,
            [skillUUID, toolID, system],
          );
        }
      }

      await client.query('DELETE FROM skill_authorizations WHERE skill_id = $1', [skillUUID]);
      const scopeDepartments =
        review.requested_scope_type === 'selected_departments'
          ? review.requested_department_ids ?? []
          : review.requested_scope_type === 'current_department' || review.requested_scope_type === 'department_tree'
            ? [review.submitter_department_id]
            : [];
      if (review.requested_scope_type) {
        if (scopeDepartments.length === 0) {
          await client.query(
            'INSERT INTO skill_authorizations (skill_id, scope_type, department_id) VALUES ($1, $2, NULL)',
            [skillUUID, review.requested_scope_type],
          );
        } else {
          for (const departmentID of scopeDepartments) {
            await client.query(
              'INSERT INTO skill_authorizations (skill_id, scope_type, department_id) VALUES ($1, $2, $3)',
              [skillUUID, review.requested_scope_type, departmentID],
            );
          }
        }
      }

      await client.query('SELECT refresh_skill_search_document($1)', [skillUUID]);

      await client.query(
        `
        UPDATE review_items
        SET workflow_state = 'published',
            review_status = 'reviewed',
            decision = 'approve',
            review_summary = $2,
            lock_owner_id = NULL,
            lock_expires_at = NULL,
            published_version_id = $3,
            updated_at = now()
        WHERE id = $1
        `,
        [review.review_id, comment, publishedVersionID],
      );
      await this.publishingRepository.insertHistory(client, review.review_id, actor?.userID ?? null, actor ? 'approve' : 'auto_approve', comment);
    });
  }

  private async enqueueSystemPrecheck(reviewID: string): Promise<void> {
    await this.publishingRepository.recordJobRun(reviewID, 'queued');
    if (this.queue) {
      await this.queue.add(reviewID, { reviewID }, { removeOnComplete: 10, removeOnFail: 10 });
    }
    setTimeout(() => {
      void this.processSystemPrecheck(reviewID);
    }, this.queue ? 250 : 0);
  }

  private parseSubmissionInput(body: Record<string, string | undefined>): SubmissionInput {
    const submissionType = (body.submissionType ?? 'publish') as SubmissionType;
    const skillID = (body.skillID ?? '').trim();
    const displayName = (body.displayName ?? '').trim();
    const description = (body.description ?? '').trim();
    const version = (body.version ?? '').trim();
    const visibilityLevel = (body.visibilityLevel ?? 'private') as VisibilityLevel;
    const scopeType = (body.scopeType ?? 'current_department') as PublishScopeType;
    const changelog = (body.changelog ?? '').trim();
    const category = (body.category ?? 'uncategorized').trim() || 'uncategorized';
    const tags = parseStringList(body.tags);
    const compatibleTools = parseStringList(body.compatibleTools);
    const compatibleSystems = parseStringList(body.compatibleSystems);
    const selectedDepartmentIDs = parseStringList(body.selectedDepartmentIDs);

    if (!['publish', 'update', 'permission_change'].includes(submissionType) || !skillID || !displayName || !description) {
      throw new BadRequestException('validation_failed');
    }
    if (submissionType !== 'permission_change' && (!version || !changelog)) {
      throw new BadRequestException('validation_failed');
    }
    if (!isVisibilityLevel(visibilityLevel) || !isScopeType(scopeType)) {
      throw new BadRequestException('validation_failed');
    }
    if (scopeType === 'selected_departments' && selectedDepartmentIDs.length === 0) {
      throw new BadRequestException('validation_failed');
    }
    return {
      submissionType,
      skillID,
      displayName,
      description,
      version,
      visibilityLevel,
      scopeType,
      selectedDepartmentIDs,
      changelog,
      category,
      tags,
      compatibleTools,
      compatibleSystems,
    };
  }

  private toReviewItem(review: ReviewRecord, actor: ActorContext): ReviewItemDto {
    return mapReviewItem(review, actor.userID);
  }

  private async toReviewDetail(
    review: ReviewRecord,
    history: ReviewHistoryDto[],
    actor: ActorContext,
    requesterUserID: string,
  ): Promise<ReviewDetailDto> {
    const packageFiles = await this.packageStorage.listPackageFilesForReview(review);
    const packageRef = review.staged_package_object_key
      ? review.review_id
      : review.current_package_id ?? undefined;
    const packageURL = packageRef
      ? await this.skillsService.issuePackageDownloadUrl(packageRef, requesterUserID, true)
      : undefined;
    return buildReviewDetailDto(review, actor.userID, history, packageFiles, packageURL);
  }

  private async toPublisherSubmissionDetail(
    review: ReviewRecord,
    history: ReviewHistoryDto[],
    userID: string,
    requesterUserID: string,
  ): Promise<PublisherSubmissionDetailDto> {
    const packageFiles = await this.packageStorage.listPackageFilesForReview(review);
    const packageRef = review.staged_package_object_key
      ? review.review_id
      : review.current_package_id ?? undefined;
    const packageURL = packageRef
      ? await this.skillsService.issuePackageDownloadUrl(packageRef, requesterUserID, true)
      : undefined;
    return buildPublisherSubmissionDetailDto(
      review,
      history,
      packageFiles,
      this.reviewerRouting.canSubmitterWithdraw(userID, review),
      packageURL,
    );
  }

  private async unzipFile(zipPath: string, targetDir: string): Promise<void> {
    await execFileAsync('unzip', ['-oq', zipPath, '-d', targetDir]);
  }

  private async resolvePackageRoot(extractDir: string): Promise<string> {
    const entries = await readdir(extractDir, { withFileTypes: true });
    const fileEntries = entries.filter((entry) => entry.isFile());
    const dirEntries = entries.filter((entry) => entry.isDirectory());
    if (fileEntries.length === 0 && dirEntries.length === 1) {
      return join(extractDir, dirEntries[0].name);
    }
    return extractDir;
  }

}

function parseStringList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Ignore JSON parse errors and fall back to CSV parsing.
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSubmissionSummary(input: SubmissionInput): string {
  const typeLabel = input.submissionType === 'publish' ? '首次发布' : input.submissionType === 'update' ? '更新发布' : '权限变更';
  return `${typeLabel}：${input.displayName}（${input.skillID}）`;
}

function isVisibilityLevel(value: string | null | undefined): value is VisibilityLevel {
  return ['private', 'summary_visible', 'detail_visible', 'public_installable'].includes(value ?? '');
}

function isScopeType(value: string | null | undefined): value is PublishScopeType {
  return ['current_department', 'department_tree', 'selected_departments', 'all_employees'].includes(value ?? '');
}
