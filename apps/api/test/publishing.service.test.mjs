import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
require('ts-node/register/transpile-only');

const { PublishingService } = require('../src/publishing/publishing.service.ts');
const {
  compareSemver,
  isPermissionExpansion,
  parseSimpleFrontmatter,
} = require('../src/publishing/publishing.utils.ts');

function createService(database) {
  return new PublishingService(database, { get: () => undefined });
}

async function createZipFixture(fileMap) {
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eah-publishing-src-'));
  const zipDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eah-publishing-zip-'));
  const zipPath = path.join(zipDir, 'package.zip');

  for (const [relativePath, content] of Object.entries(fileMap)) {
    const targetPath = path.join(sourceDir, relativePath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content);
  }

  execFileSync('zip', ['-qr', zipPath, '.'], { cwd: sourceDir });
  const buffer = await fs.readFile(zipPath);
  rmSync(sourceDir, { recursive: true, force: true });
  rmSync(zipDir, { recursive: true, force: true });
  return buffer;
}

test('publishing utils parse frontmatter and detect semver expansion rules', () => {
  const frontmatter = parseSimpleFrontmatter(`---
name: prompt-guardrails
description: Prompt guard rails
allowed-tools:
  - bash
  - web
---

body`);

  assert.equal(frontmatter.name, 'prompt-guardrails');
  assert.equal(frontmatter.description, 'Prompt guard rails');
  assert.deepEqual(frontmatter.allowedTools, ['bash', 'web']);
  assert.equal(compareSemver('1.2.0', '1.1.9') > 0, true);
  assert.equal(
    isPermissionExpansion({
      currentVisibilityLevel: 'summary_visible',
      currentScopeType: 'current_department',
      nextVisibilityLevel: 'detail_visible',
      nextScopeType: 'department_tree',
      currentSelectedDepartmentIDs: [],
      nextSelectedDepartmentIDs: [],
    }),
    true,
  );
  assert.equal(
    isPermissionExpansion({
      currentVisibilityLevel: 'public_installable',
      currentScopeType: 'all_employees',
      nextVisibilityLevel: 'summary_visible',
      nextScopeType: 'current_department',
      currentSelectedDepartmentIDs: [],
      nextSelectedDepartmentIDs: [],
    }),
    false,
  );
});

test('PublishingService routes normal-user submissions to direct department admins', async () => {
  const database = {
    async query(text, values = []) {
      if (/FROM users\s+WHERE role = 'admin'[\s\S]*department_id = \$1/.test(text)) {
        assert.deepEqual(values, ['dept_frontend']);
        return { rows: [{ id: 'u_admin_front_1' }, { id: 'u_admin_front_2' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const service = createService(database);
  const reviewerIDs = await service['eligibleReviewerIDsFor']({
    workflow_state: 'pending_review',
    review_type: 'publish',
    requested_visibility_level: 'summary_visible',
    requested_scope_type: 'current_department',
    current_scope_type: null,
    current_visibility_level: null,
    current_scope_department_ids: [],
    requested_department_ids: [],
    submitter_role: 'normal_user',
    submitter_admin_level: null,
    submitter_department_id: 'dept_frontend',
    submitter_id: 'u_author_frontend',
  });
  assert.deepEqual(reviewerIDs, ['u_admin_front_1', 'u_admin_front_2']);
});

test('PublishingService routes level-4 private submissions to peer admins before escalation', async () => {
  const database = {
    async query(text, values = []) {
      if (/FROM users u[\s\S]*u\.admin_level = \$1/.test(text) && /d\.parent_id IS NOT DISTINCT FROM \$3/.test(text)) {
        assert.deepEqual(values, [4, 'u_admin_l4_a', 'dept_backend']);
        return { rows: [{ id: 'u_admin_l4_b' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const service = createService(database);
  const reviewerIDs = await service['eligibleReviewerIDsFor']({
    workflow_state: 'pending_review',
    review_type: 'publish',
    requested_visibility_level: 'summary_visible',
    requested_scope_type: 'current_department',
    current_scope_type: null,
    current_visibility_level: null,
    current_scope_department_ids: [],
    requested_department_ids: [],
    submitter_role: 'admin',
    submitter_admin_level: 4,
    submitter_department_id: 'dept_java_a',
    submitter_parent_department_id: 'dept_backend',
    submitter_id: 'u_admin_l4_a',
  });
  assert.deepEqual(reviewerIDs, ['u_admin_l4_b']);
});

test('PublishingService routes public submissions to nearest level-3 reviewer on the org chain', async () => {
  const database = {
    async query(text, values = []) {
      if (/WITH RECURSIVE ancestry/.test(text)) {
        return {
          rows: [
            { department_id: 'dept_java_a', parent_id: 'dept_backend', path: '/集团/技术部/后端组/JavaA', level: 3 },
            { department_id: 'dept_backend', parent_id: 'dept_engineering', path: '/集团/技术部/后端组', level: 2 },
            { department_id: 'dept_engineering', parent_id: 'dept_company', path: '/集团/技术部', level: 1 },
            { department_id: 'dept_company', parent_id: null, path: '/集团', level: 0 },
          ],
        };
      }
      if (/u\.admin_level = \$1/.test(text) && /u\.department_id = ANY/.test(text)) {
        assert.equal(values[0], 3);
        return { rows: [{ id: 'u_admin_l3_backend', department_id: 'dept_backend' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const service = createService(database);
  const reviewerIDs = await service['eligibleReviewerIDsFor']({
    workflow_state: 'pending_review',
    review_type: 'publish',
    requested_visibility_level: 'public_installable',
    requested_scope_type: 'all_employees',
    current_scope_type: null,
    current_visibility_level: null,
    current_scope_department_ids: [],
    requested_department_ids: [],
    submitter_role: 'admin',
    submitter_admin_level: 4,
    submitter_department_id: 'dept_java_a',
    submitter_parent_department_id: 'dept_backend',
    submitter_id: 'u_admin_l4_a',
  });
  assert.deepEqual(reviewerIDs, ['u_admin_l3_backend']);
});

test('PublishingService lets authors delist and relist their own skills but blocks invalid transitions', async () => {
  const queries = [];
  const service = createService({
    async query(text, values = []) {
      queries.push({ text, values });
      return { rows: [] };
    },
  });

  service.loadActor = async () => ({ userID: 'u_author', role: 'normal_user' });
  service.loadSkillByID = async () => ({
    skill_id: 'prompt-guardrails',
    author_id: 'u_author',
    status: 'published',
  });
  service.listPublisherSkills = async () => [{ skillID: 'prompt-guardrails', currentStatus: 'delisted' }];

  const delisted = await service.setPublisherSkillStatus('u_author', 'prompt-guardrails', 'delist');
  assert.deepEqual(delisted, [{ skillID: 'prompt-guardrails', currentStatus: 'delisted' }]);
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /UPDATE skills SET status = \$2/);
  assert.deepEqual(queries[0].values, ['prompt-guardrails', 'delisted']);

  service.loadSkillByID = async () => ({
    skill_id: 'prompt-guardrails',
    author_id: 'u_author',
    status: 'archived',
  });
  await assert.rejects(
    () => service.setPublisherSkillStatus('u_author', 'prompt-guardrails', 'relist'),
    /validation_failed/,
  );

  service.loadSkillByID = async () => ({
    skill_id: 'prompt-guardrails',
    author_id: 'u_other',
    status: 'published',
  });
  await assert.rejects(
    () => service.setPublisherSkillStatus('u_author', 'prompt-guardrails', 'delist'),
    /permission_denied/,
  );
});

test('PublishingService lists previewable package files and truncates large text previews', async () => {
  const largeText = 'A'.repeat(270 * 1024);
  const packageBuffer = await createZipFixture({
    'SKILL.md': '# Prompt Guardrails\n\nreview content\n',
    'README.markdown': '## Details\n\nMore text\n',
    'assets/notes.txt': 'plain text file\n',
    'assets/logo.png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    'docs/large.txt': largeText,
  });

  const service = createService({ async query() { throw new Error('query not expected'); } });
  service.readReviewPackageBuffer = async () => packageBuffer;

  const files = await service.listPackageFilesForReview({});
  assert.deepEqual(
    files.map((file) => [file.relativePath, file.fileType, file.previewable]),
    [
      ['assets/logo.png', 'other', false],
      ['assets/notes.txt', 'text', true],
      ['docs/large.txt', 'text', true],
      ['README.markdown', 'markdown', true],
      ['SKILL.md', 'markdown', true],
    ],
  );

  const skillDoc = await service.readPackageFileContentForReview({}, 'SKILL.md');
  assert.equal(skillDoc.fileType, 'markdown');
  assert.equal(skillDoc.truncated, false);
  assert.match(skillDoc.content, /Prompt Guardrails/);

  const largeDoc = await service.readPackageFileContentForReview({}, 'docs/large.txt');
  assert.equal(largeDoc.fileType, 'text');
  assert.equal(largeDoc.truncated, true);
  assert.equal(largeDoc.content.length, 256 * 1024);

  await assert.rejects(
    () => service.readPackageFileContentForReview({}, 'assets/logo.png'),
    /validation_failed/,
  );
});
