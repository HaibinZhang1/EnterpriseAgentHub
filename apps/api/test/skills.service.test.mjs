import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
require('ts-node/register/transpile-only');

const { SkillsService, buildSkillListQueryPlan } = require('../src/skills/skills.service.ts');
const { PackageDownloadService } = require('../src/skills/package-download.service.ts');
const { SkillAuthorizationService } = require('../src/skills/skill-authorization.service.ts');
const { SkillQueryService } = require('../src/skills/skill-query.service.ts');

function skillRow(overrides = {}) {
  return {
    id: 'skill-row-1',
    skill_id: 'codex-review-helper',
    display_name: 'Codex Review Helper',
    description: '为 Codex 项目提供代码审查提示和提交前检查清单。',
    status: 'published',
    visibility_level: 'public_installable',
    category: 'engineering',
    updated_at: new Date('2026-04-11T02:30:00Z'),
    version: '1.2.0',
    risk_level: 'low',
    risk_description: '低风险：不含可执行二进制。',
    review_summary: 'P1 审核通过：仅包含提示词和 README。',
    published_at: new Date('2026-04-11T02:30:00Z'),
    author_name: '李四',
    author_department: '前端组',
    tags: ['codex', 'review', 'quality'],
    compatible_tools: ['codex'],
    compatible_systems: ['macos', 'windows'],
    scope_type: null,
    scope_department_ids: null,
    scope_department_paths: null,
    star_count: '12',
    download_count: '33',
    total_count: '1',
    ...overrides,
  };
}

function skillsServiceForRepository(repository) {
  const authorization = new SkillAuthorizationService(repository);
  const queryService = new SkillQueryService(repository, authorization);
  const packageDownloads = new PackageDownloadService(repository, authorization);
  return new SkillsService(queryService, packageDownloads, repository);
}

test('buildSkillListQueryPlan pushes search, filters, sort, and pagination into SQL', () => {
  const plan = buildSkillListQueryPlan({
    q: 'review helper',
    departmentID: '前端组',
    compatibleTool: 'codex',
    category: 'engineering',
    riskLevel: 'low',
    publishedSince: '2026-04-01T00:00:00.000Z',
    updatedSince: '2026-04-10T00:00:00.000Z',
    accessScope: 'authorized_only',
    sort: 'download_count',
    page: '2',
    pageSize: '10',
    installed: 'true',
    enabled: 'true',
  }, { requirePublished: true });

  assert.match(plan.text, /skill_search_documents/);
  assert.match(plan.text, /websearch_to_tsquery/);
  assert.match(plan.text, /POSITION\(LOWER\(\$1\) IN LOWER\(doc\.document\)\) > 0/);
  assert.match(plan.text, /s\.status = 'published'/);
  assert.match(plan.text, /EXISTS \(\s*SELECT 1\s*FROM skill_tool_compatibilities tc_filter/s);
  assert.match(plan.text, /d\.name = \$2/);
  assert.match(plan.text, /s\.category = \$4/);
  assert.match(plan.text, /v\.risk_level = \$5/);
  assert.match(plan.text, /v\.published_at >= \$6/);
  assert.match(plan.text, /s\.updated_at >= \$7/);
  assert.match(plan.text, /base\.download_count::bigint DESC/);
  assert.doesNotMatch(plan.text, /installed/i);
  assert.doesNotMatch(plan.text, /enabled/i);
  assert.equal(plan.page, 2);
  assert.equal(plan.pageSize, 10);
  assert.deepEqual(plan.values, [
    'review helper',
    '前端组',
    'codex',
    'engineering',
    'low',
    '2026-04-01T00:00:00.000Z',
    '2026-04-10T00:00:00.000Z',
    10,
    10,
  ]);
});

test('buildSkillListQueryPlan pushes authenticated visibility rules into SQL', () => {
  const plan = buildSkillListQueryPlan(
    {
      accessScope: 'authorized_only',
      page: '3',
      pageSize: '25',
    },
    {
      requirePublished: true,
      requester: {
        user_id: 'user-1',
        department_id: 'dept-child',
        department_path: 'company/product/frontend',
      },
    },
  );

  assert.match(plan.text, /s\.status = 'published'/);
  assert.match(plan.text, /auth\.scope_type = 'all_employees'/);
  assert.match(plan.text, /auth\.scope_type IN \('current_department', 'selected_departments'\)/);
  assert.match(plan.text, /unnest\(auth\.scope_department_paths\)/);
  assert.match(plan.text, /auth\.scope_type IS NULL AND s\.visibility_level = 'public_installable'/);
  assert.match(plan.text, /s\.visibility_level <> 'private'/);
  assert.doesNotMatch(plan.text, /s\.visibility_level IN \('public_installable', 'detail_visible', 'summary_visible'\)/);
  assert.deepEqual(plan.values, ['dept-child', 'company/product/frontend', 'company/product/frontend', 25, 50]);
});

test('SkillsService.list executes a paged SQL plan and maps rows to summaries', async () => {
  const calls = [];
  const repository = {
    async listSkills(plan) {
      calls.push(plan);
      return [skillRow()];
    },
    async loadRequesterScope() {
      throw new Error('anonymous list should not load requester scope');
    },
  };

  const service = skillsServiceForRepository(repository);
  const page = await service.list({ q: 'codex', sort: 'relevance', page: '1', pageSize: '5' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /LIMIT \$2\s+OFFSET \$3/);
  assert.match(calls[0].text, /s\.status = 'published'/);
  assert.deepEqual(calls[0].values, ['codex', 5, 0]);
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 5);
  assert.equal(page.total, 1);
  assert.equal(page.hasMore, false);
  assert.equal(page.items[0].skillID, 'codex-review-helper');
  assert.equal(page.items[0].canInstall, true);
  assert.equal(page.items[0].installState, 'not_installed');
  assert.equal(page.items[0].starCount, 12);
  assert.equal(page.items[0].downloadCount, 33);
});

test('SkillAuthorizationService evaluates department tree and detail fallback rules', () => {
  const authorization = new SkillAuthorizationService({});
  const requester = {
    user_id: 'user-1',
    department_id: 'dept-child',
    department_path: 'company/product/frontend',
  };

  assert.deepEqual(
    authorization.authorizationFor(
      skillRow({
        visibility_level: 'private',
        scope_type: 'department_tree',
        scope_department_ids: ['dept-parent'],
        scope_department_paths: ['company/product'],
      }),
      requester,
    ),
    { isAuthorized: true, detailAccess: 'full' },
  );

  assert.deepEqual(
    authorization.authorizationFor(
      skillRow({
        visibility_level: 'summary_visible',
        scope_type: 'selected_departments',
        scope_department_ids: ['dept-other'],
        scope_department_paths: null,
      }),
      requester,
    ),
    { isAuthorized: false, detailAccess: 'summary' },
  );

  assert.deepEqual(
    authorization.authorizationFor(
      skillRow({
        visibility_level: 'private',
        scope_type: 'selected_departments',
        scope_department_ids: ['dept-other'],
        scope_department_paths: null,
      }),
      requester,
    ),
    { isAuthorized: false, detailAccess: 'none' },
  );
});

test('PackageDownloadService denies unauthorized download tickets before loading packages', async () => {
  let packageLoaded = false;
  const repository = {
    async findSkill() {
      return skillRow({
        visibility_level: 'private',
        scope_type: 'selected_departments',
        scope_department_ids: ['dept-a'],
      });
    },
    async loadRequesterScope() {
      return {
        user_id: 'user-1',
        department_id: 'dept-b',
        department_path: 'company/product/backend',
      };
    },
    async loadPublishedPackageForVersion() {
      packageLoaded = true;
      return null;
    },
  };

  const service = new PackageDownloadService(repository, new SkillAuthorizationService(repository));
  await assert.rejects(() => service.downloadTicket('codex-review-helper', {}, 'user-1'), /permission_denied/);
  assert.equal(packageLoaded, false);
});

test('PackageDownloadService issues tickets for authorized published packages', async () => {
  const insertedTickets = [];
  const repository = {
    async findSkill() {
      return skillRow();
    },
    async loadPublishedPackageForVersion(skillID, version) {
      assert.equal(skillID, 'codex-review-helper');
      assert.equal(version, '1.2.0');
      return {
        id: 'package-1',
        skill_id: 'codex-review-helper',
        version: '1.2.0',
        bucket: 'skills',
        sha256: 'sha256:abc',
        size_bytes: 2048,
        file_count: 3,
        object_key: 'skills/codex-review-helper/1.2.0/package.zip',
        content_type: 'application/zip',
      };
    },
    async insertPackageDownloadTicket(input) {
      insertedTickets.push(input);
    },
  };

  const service = new PackageDownloadService(repository, new SkillAuthorizationService(repository));
  const ticket = await service.downloadTicket('codex-review-helper', {}, undefined);

  assert.equal(insertedTickets.length, 1);
  assert.equal(insertedTickets[0].packageRef, 'package-1');
  assert.equal(insertedTickets[0].purpose, 'published');
  assert.equal(insertedTickets[0].requiresAuth, false);
  assert.equal(ticket.skillID, 'codex-review-helper');
  assert.equal(ticket.packageHash, 'sha256:abc');
  assert.match(ticket.packageURL, /^\/skill-packages\/package-1\/download\?ticket=/);
});
