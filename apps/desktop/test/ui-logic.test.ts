import assert from "node:assert/strict";
import test from "node:test";
import type { LocalNotification, ProjectConfig, PublishDraft, ScanTargetSummary, SkillSummary, ToolConfig } from "../src/domain/p1.ts";
import { buildSkillListQuery } from "../src/services/p1Client.ts";
import {
  buildPublishPrecheck,
  deriveTopLevelNavigation,
  legacyPageForView,
  mapLegacyPageToView,
  presentConfirmWithDrawerDismissal,
  presentModalWithDrawerDismissal
} from "../src/state/useDesktopUIState.ts";
import { deriveDesktopNotifications, notificationBadgeLabel, resolveDesktopNotificationAction, type AppUpdateState } from "../src/state/ui/desktopNotifications.ts";
import { collectInstalledSkillIssues } from "../src/state/ui/installedSkillSelectors.ts";
import { deriveMarketSkills, deriveVisibleNavigation } from "../src/state/workspace/workspaceDerivedState.ts";
import { defaultProjectSkillsPath, defaultToolConfigPath } from "../src/utils/platformPaths.ts";

const baseDraft: PublishDraft = {
  submissionType: "publish",
  uploadMode: "folder",
  packageName: "prompt-guardrails",
  skillID: "prompt-guardrails",
  displayName: "提示词护栏模板",
  description: "为审核与发布前流程提供护栏检查。",
  version: "1.0.0",
  scope: "current_department",
  selectedDepartmentIDs: [],
  visibility: "detail_visible",
  changelog: "首次发布",
  category: "governance",
  tags: ["prompt", "governance"],
  compatibleTools: ["codex"],
  compatibleSystems: ["windows"],
  files: [
    { name: "SKILL.md", relativePath: "SKILL.md", size: 1_200, mimeType: "text/markdown" },
    { name: "README.md", relativePath: "README.md", size: 820, mimeType: "text/markdown" }
  ]
};

const baseSkill: SkillSummary = {
  skillID: "review-helper",
  displayName: "Review Helper",
  description: "审核辅助",
  version: "1.0.0",
  localVersion: "1.0.0",
  latestVersion: "1.0.0",
  status: "published",
  visibilityLevel: "detail_visible",
  detailAccess: "full",
  canInstall: true,
  canUpdate: false,
  installState: "installed",
  authorName: "张三",
  authorDepartment: "平台工程部",
  currentVersionUpdatedAt: "2026-04-09T08:00:00Z",
  publishedAt: "2026-04-09T08:00:00Z",
  compatibleTools: ["codex"],
  compatibleSystems: ["windows"],
  tags: ["governance"],
  category: "开发效率",
  riskLevel: "low",
  starCount: 20,
  downloadCount: 100,
  starred: false,
  isScopeRestricted: false,
  hasLocalHashDrift: false,
  enabledTargets: [],
  lastEnabledAt: null
};

test("publish precheck passes for a valid folder upload with SKILL.md", () => {
  const result = buildPublishPrecheck(baseDraft);
  assert.equal(result.canSubmit, true);
  assert.equal(result.items.find((item) => item.id === "skill-doc")?.status, "pass");
});

test("blocking modal presentation closes the skill detail before opening the overlay", () => {
  const calls: string[] = [];
  presentModalWithDrawerDismissal(
    { type: "targets", skillID: "ops-oncall-companion" },
    {
      closeSkillDetail: () => {
        calls.push("close-detail");
      },
      setModal: (modal) => {
        calls.push(`modal:${modal.type}`);
      }
    }
  );

  assert.deepEqual(calls, ["close-detail", "modal:targets"]);
});

test("clearing a confirm modal does not touch the skill detail overlay", () => {
  const calls: string[] = [];
  presentConfirmWithDrawerDismissal(null, {
    closeSkillDetail: () => {
      calls.push("close-detail");
    },
    setConfirmModal: (modal) => {
      calls.push(`confirm:${modal === null ? "none" : "open"}`);
    }
  });

  assert.deepEqual(calls, ["confirm:none"]);
});

test("new top-level navigation only shows manage for connected admins", () => {
  assert.deepEqual(deriveTopLevelNavigation({ isAdminConnected: false }), ["home", "community", "local"]);
  assert.deepEqual(deriveTopLevelNavigation({ isAdminConnected: true }), ["home", "community", "local", "manage"]);
});

test("legacy pages map into the new section model", () => {
  assert.deepEqual(mapLegacyPageToView("market"), { section: "community", communityPane: "skills" });
  assert.deepEqual(mapLegacyPageToView("my_installed"), { section: "local", localPane: "skills" });
  assert.deepEqual(mapLegacyPageToView("admin_users"), { section: "manage", managePane: "users" });
  assert.equal(
    legacyPageForView({
      section: "manage",
      localPane: "skills",
      managePane: "reviews",
      overlay: { kind: "none" }
    }),
    "review"
  );
  assert.equal(
    legacyPageForView({
      section: "community",
      localPane: "skills",
      managePane: "reviews",
      overlay: { kind: "publisher", pane: "compose" }
    }),
    "publisher"
  );
});

test("notification actions route old review and publisher events into the new IA targets", () => {
  const appUpdate: AppUpdateState = {
    available: true,
    currentVersion: "0.1.0",
    latestVersion: "0.1.3",
    summary: "更新说明",
    highlights: ["a"],
    occurredAt: "2026-04-18T09:00:00.000Z",
    unread: true,
    releaseURL: null,
    actionLabel: "查看更新"
  };
  const notifications: LocalNotification[] = [
    {
      notificationID: "notify-review",
      type: "connection_restored",
      title: "你有新的待审核任务",
      summary: "review-123 已进入审核",
      relatedSkillID: "review-helper",
      targetPage: "review",
      occurredAt: "2026-04-18T10:00:00.000Z",
      unread: true,
      source: "remote"
    },
    {
      notificationID: "notify-skill",
      type: "skill_update_available",
      title: "Review Helper 有新版本可更新",
      summary: "1.0.1 可更新",
      relatedSkillID: "review-helper",
      targetPage: "my_installed",
      occurredAt: "2026-04-18T09:30:00.000Z",
      unread: true,
      source: "remote"
    }
  ];

  const desktopNotifications = deriveDesktopNotifications({ appUpdate, notifications });
  const reviewNotification = desktopNotifications.find((item) => item.notificationID === "notify-review");
  const skillNotification = desktopNotifications.find((item) => item.notificationID === "notify-skill");

  assert.equal(notificationBadgeLabel(12), "9+");
  assert.ok(reviewNotification);
  assert.ok(skillNotification);

  assert.deepEqual(
    resolveDesktopNotificationAction(reviewNotification!, {
      reviews: [{ reviewID: "review-123", skillID: "review-helper" }],
      publisherSubmissions: [{ submissionID: "submission-1", skillID: "review-helper" }]
    }),
    { kind: "review", reviewID: "review-123", skillID: "review-helper" }
  );

  assert.deepEqual(
    resolveDesktopNotificationAction(skillNotification!, {
      reviews: [],
      publisherSubmissions: []
    }),
    { kind: "my_installed", installedFilter: "updates", skillID: "review-helper" }
  );
});

test("workspace visible navigation still honors backend permissions and publish feature", () => {
  const visible = deriveVisibleNavigation({
    authState: "authenticated",
    bootstrap: {
      user: {
        userID: "u1",
        username: "lin",
        displayName: "Lin",
        role: "admin",
        adminLevel: 4,
        departmentID: "d1",
        departmentName: "平台工程部",
        locale: "zh-CN"
      },
      connection: {
        status: "connected",
        serverTime: "2026-04-18T10:00:00.000Z",
        apiVersion: "1.0.0"
      },
      features: {
        p1Desktop: true,
        publishSkill: true,
        reviewWorkbench: true,
        adminManage: true,
        mcpManage: false,
        pluginManage: false
      },
      counts: {
        installedCount: 1,
        enabledCount: 0,
        updateAvailableCount: 0,
        unreadNotificationCount: 0
      },
      navigation: ["home", "market", "my_installed", "review", "admin_users"],
      menuPermissions: ["home", "market", "my_installed", "review", "admin_users"]
    }
  });

  assert.deepEqual(visible, ["home", "market", "my_installed", "publisher", "review", "admin_users"]);
});

test("market skill derivation still filters and sorts by query and category", () => {
  const result = deriveMarketSkills({
    authState: "authenticated",
    bootstrap: {
      user: {
        userID: "u1",
        username: "lin",
        displayName: "Lin",
        role: "admin",
        adminLevel: 4,
        departmentID: "d1",
        departmentName: "平台工程部",
        locale: "zh-CN"
      },
      connection: {
        status: "connected",
        serverTime: "2026-04-18T10:00:00.000Z",
        apiVersion: "1.0.0"
      },
      features: {
        p1Desktop: true,
        publishSkill: true,
        reviewWorkbench: true,
        adminManage: true,
        mcpManage: false,
        pluginManage: false
      },
      counts: {
        installedCount: 1,
        enabledCount: 0,
        updateAvailableCount: 0,
        unreadNotificationCount: 0
      },
      navigation: ["home", "market"],
      menuPermissions: ["home", "market"]
    },
    filters: {
      query: "review",
      department: "all",
      compatibleTool: "all",
      installed: "all",
      enabled: "all",
      accessScope: "include_public",
      category: "开发效率",
      riskLevel: "all",
      publishedWithin: "all",
      updatedWithin: "all",
      sort: "download_count"
    },
    skills: [
      baseSkill,
      {
        ...baseSkill,
        skillID: "doc-helper",
        displayName: "Doc Helper",
        category: "文档",
        downloadCount: 10,
        description: "文档辅助"
      }
    ]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.skillID, "review-helper");
});

test("installed skill issues cover local hash drift and unavailable targets", () => {
  const skill: SkillSummary = {
    ...baseSkill,
    skillID: "context-router",
    displayName: "上下文路由助手",
    version: "1.4.0",
    localVersion: "1.2.0",
    latestVersion: "1.4.0",
    canUpdate: true,
    installState: "update_available",
    hasLocalHashDrift: true,
    enabledTargets: [
      {
        targetType: "tool",
        targetID: "cursor",
        targetName: "Cursor",
        targetPath: "D:\\cursor\\rules",
        requestedMode: "symlink",
        resolvedMode: "copy",
        fallbackReason: "symlink_permission_denied",
        enabledAt: "2026-04-10T08:40:00Z"
      },
      {
        targetType: "project",
        targetID: "removed-project",
        targetName: "Removed Project",
        targetPath: "D:\\workspace\\Removed\\.codex\\skills",
        requestedMode: "symlink",
        resolvedMode: "symlink",
        fallbackReason: null,
        enabledAt: "2026-04-10T08:40:00Z"
      }
    ],
    lastEnabledAt: "2026-04-10T08:40:00Z"
  };
  const tools: ToolConfig[] = [
    {
      toolID: "cursor",
      name: "Cursor",
      displayName: "Cursor",
      configPath: "D:\\cursor\\settings.json",
      detectedPath: null,
      configuredPath: "D:\\cursor\\rules",
      skillsPath: "D:\\cursor\\rules",
      enabled: true,
      status: "invalid",
      adapterStatus: "invalid",
      detectionMethod: "manual",
      transform: "cursor_rule",
      transformStrategy: "cursor_rule",
      enabledSkillCount: 0,
      lastScannedAt: "2026-04-10T08:40:00Z"
    }
  ];
  const projects: ProjectConfig[] = [];
  const scanTargets: ScanTargetSummary[] = [
    {
      id: "tool:cursor",
      targetType: "tool",
      targetID: "cursor",
      targetName: "Cursor",
      targetPath: "D:\\cursor\\rules",
      transformStrategy: "cursor_rule",
      scannedAt: "2026-04-10T08:40:00Z",
      counts: { managed: 0, unmanaged: 0, conflict: 1, orphan: 0 },
      findings: [
        {
          id: "tool:cursor:context-router",
          kind: "conflict",
          skillID: "context-router",
          targetType: "tool",
          targetID: "cursor",
          targetName: "Cursor",
          targetPath: "D:\\cursor\\rules\\context-router",
          relativePath: "context-router",
          checksum: "drifted",
          message: "目标内容与登记产物不一致，可能被手动修改或被其他流程覆盖。"
        }
      ],
      lastError: null
    }
  ];

  const issues = collectInstalledSkillIssues(skill, { tools, projects, scanTargets });

  assert.match(issues.join(" | "), /本地内容已变更/);
  assert.match(issues.join(" | "), /路径不可用/);
  assert.match(issues.join(" | "), /项目已移除/);
  assert.match(issues.join(" | "), /登记产物不一致/);
});

test("platform path helpers emit expected defaults", () => {
  assert.equal(defaultToolConfigPath("cursor", "macos"), "~/.cursor/cli-config.json");
  assert.equal(defaultProjectSkillsPath("/Users/demo/EnterpriseAgentHub", "macos"), "/Users/demo/EnterpriseAgentHub/.codex/skills");
});

test("market query builder keeps installed/enabled local-only while sending category and date filters", () => {
  const params = buildSkillListQuery(
    {
      query: "review helper",
      department: "平台工程部",
      compatibleTool: "codex",
      installed: "installed",
      enabled: "enabled",
      accessScope: "authorized_only",
      category: "governance",
      riskLevel: "low",
      publishedWithin: "30d",
      updatedWithin: "7d",
      sort: "download_count"
    },
    new Date("2026-04-13T00:00:00.000Z")
  );

  assert.equal(params.get("q"), "review helper");
  assert.equal(params.get("departmentID"), "平台工程部");
  assert.equal(params.get("compatibleTool"), "codex");
  assert.equal(params.get("accessScope"), "authorized_only");
  assert.equal(params.get("category"), "governance");
  assert.equal(params.get("riskLevel"), "low");
  assert.equal(params.get("sort"), "download_count");
  assert.equal(params.get("installed"), null);
  assert.equal(params.get("enabled"), null);
});
