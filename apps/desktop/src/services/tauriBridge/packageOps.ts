import type { DownloadTicket, EnabledTarget, LocalEvent, LocalSkillInstall, RequestedMode, SkillSummary, TargetType } from "../../domain/p1.ts";
import { P1_LOCAL_COMMANDS } from "@enterprise-agent-hub/shared-contracts";
import { seedSkills } from "../../fixtures/p1SeedData.ts";
import { appendSkillPath, detectDesktopPlatform, previewCentralStorePath } from "../../utils/platformPaths.ts";
import { localCommandErrorMessage, pendingLocalCommand } from "./common.ts";
import { buildDisableSkillArgs, buildEnableSkillArgs, buildUninstallSkillArgs, normalizeUninstallSkillResult } from "./localCommandArgs.ts";
import { buildLocalEvent, buildTarget } from "./preview.ts";
import { allowTauriMocks, getInvoke, invokeWithTimeout, isBrowserPreviewMode, mockWait, requireInvoke, type TauriInvoker } from "./runtime.ts";

async function callLocalCommand<T>(invoke: TauriInvoker, command: string, args: Record<string, unknown> | undefined, actionLabel: string): Promise<T> {
  try {
    return await invokeWithTimeout<T>(invoke, command, args);
  } catch (error) {
    throw new Error(localCommandErrorMessage(error, actionLabel));
  }
}

function mockInstalledPackage(downloadTicket: DownloadTicket): LocalSkillInstall {
  return {
    skillID: downloadTicket.skillID,
    displayName: downloadTicket.skillID,
    localVersion: downloadTicket.version,
    localHash: downloadTicket.packageHash,
    sourcePackageHash: downloadTicket.packageHash,
    sourceType: "remote",
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    localStatus: "installed",
    centralStorePath: "",
    enabledTargets: [],
    hasUpdate: false,
    isScopeRestricted: false,
    canUpdate: true
  };
}

function fallbackSkill(skillID: string): SkillSummary {
  return {
    skillID,
    displayName: skillID,
    description: "",
    version: "0.0.0",
    localVersion: "0.0.0",
    status: "published",
    visibilityLevel: "detail_visible",
    detailAccess: "summary",
    canInstall: false,
    canUpdate: false,
    installState: "installed",
    currentVersionUpdatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    compatibleTools: [],
    compatibleSystems: [],
    tags: ["入门"],
    category: "其他",
    riskLevel: "unknown",
    starCount: 0,
    downloadCount: 0,
    starred: false,
    isScopeRestricted: false,
    hasLocalHashDrift: false,
    enabledTargets: [],
    lastEnabledAt: null
  };
}

export async function installSkillPackage(downloadTicket: DownloadTicket): Promise<LocalSkillInstall> {
  const invoke = getInvoke();
  if (invoke) {
    return callLocalCommand(invoke, P1_LOCAL_COMMANDS.installSkillPackage, { downloadTicket }, "安装 Skill");
  }
  if (isBrowserPreviewMode()) {
    throw pendingLocalCommand("install_skill_package");
  }
  if (!allowTauriMocks) {
    await requireInvoke();
  }
  await mockWait(220);
  return mockInstalledPackage(downloadTicket);
}

export async function updateSkillPackage(downloadTicket: DownloadTicket): Promise<LocalSkillInstall> {
  const invoke = getInvoke();
  if (invoke) {
    return callLocalCommand(invoke, P1_LOCAL_COMMANDS.updateSkillPackage, { downloadTicket }, "更新 Skill");
  }
  if (isBrowserPreviewMode()) {
    throw pendingLocalCommand("update_skill_package");
  }
  if (!allowTauriMocks) {
    await requireInvoke();
  }
  await mockWait(220);
  return mockInstalledPackage(downloadTicket);
}

export async function importLocalSkill(input: {
  targetType: TargetType;
  targetID: string;
  relativePath: string;
  skillID: string;
  conflictStrategy: "rename" | "replace";
}): Promise<LocalSkillInstall> {
  const invoke = getInvoke();
  if (invoke) {
    return callLocalCommand(invoke, P1_LOCAL_COMMANDS.importLocalSkill, { input }, "纳入本地 Skill");
  }
  if (isBrowserPreviewMode()) {
    throw pendingLocalCommand("import_local_skill");
  }
  if (!allowTauriMocks) {
    await requireInvoke();
  }
  await mockWait(220);
  return {
    skillID: input.skillID,
    displayName: input.skillID,
    localVersion: "0.0.0-local",
    localHash: `sha256:local-${input.skillID}`,
    sourcePackageHash: `sha256:local-${input.skillID}`,
    sourceType: "local_import",
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    localStatus: "enabled",
    centralStorePath: appendSkillPath(previewCentralStorePath(), input.skillID, detectDesktopPlatform()),
    enabledTargets: [
      buildTarget(fallbackSkill(input.skillID), input.targetType, input.targetID, "copy")
    ],
    hasUpdate: false,
    isScopeRestricted: false,
    canUpdate: false
  };
}

export async function uninstallSkill(skillID: string): Promise<{ removedTargetIDs: string[]; failedTargetIDs: string[]; event: LocalEvent }> {
  const invoke = getInvoke();
  if (invoke) {
    const result = await callLocalCommand<Parameters<typeof normalizeUninstallSkillResult>[0]>(
      invoke,
      P1_LOCAL_COMMANDS.uninstallSkill,
      buildUninstallSkillArgs(skillID),
      "卸载 Skill"
    );
    return normalizeUninstallSkillResult(result);
  }
  if (isBrowserPreviewMode()) {
    throw pendingLocalCommand("uninstall_skill");
  }
  if (!allowTauriMocks) {
    await requireInvoke();
  }
  await mockWait(220);
  const skill = seedSkills.find((item) => item.skillID === skillID);
  return {
    removedTargetIDs: skill?.enabledTargets.map((target) => target.targetID) ?? [],
    failedTargetIDs: [],
    event: buildLocalEvent({
      eventType: "uninstall_result",
      skill: skill ?? fallbackSkill(skillID),
      targetType: "tool",
      targetID: "local_install",
      targetPath: appendSkillPath(previewCentralStorePath(), skillID, detectDesktopPlatform()),
      requestedMode: "copy",
      resolvedMode: "copy",
      fallbackReason: null,
      occurredAt: new Date().toISOString()
    })
  };
}

export async function enableSkill(input: { skill: SkillSummary; targetType: TargetType; targetID: string; requestedMode: RequestedMode; allowOverwrite?: boolean }): Promise<{ target: EnabledTarget; event: LocalEvent }> {
  const invoke = getInvoke();
  if (invoke) {
    const target = await callLocalCommand<EnabledTarget>(invoke, P1_LOCAL_COMMANDS.enableSkill, buildEnableSkillArgs(input), "启用 Skill");
    return {
      target,
      event: buildLocalEvent({
        eventType: "enable_result",
        skill: input.skill,
        targetType: input.targetType,
        targetID: input.targetID,
        targetPath: target.targetPath,
        requestedMode: target.requestedMode,
        resolvedMode: target.resolvedMode,
        fallbackReason: target.fallbackReason,
        occurredAt: target.enabledAt
      })
    };
  }
  if (isBrowserPreviewMode()) {
    throw pendingLocalCommand("enable_skill");
  }
  if (!allowTauriMocks) {
    await requireInvoke();
  }
  await mockWait(240);
  const target = buildTarget(input.skill, input.targetType, input.targetID, input.requestedMode);
  return {
    target,
    event: buildLocalEvent({
      eventType: "enable_result",
      skill: input.skill,
      targetType: input.targetType,
      targetID: input.targetID,
      targetPath: target.targetPath,
      requestedMode: input.requestedMode,
      resolvedMode: target.resolvedMode,
      fallbackReason: target.fallbackReason,
      occurredAt: target.enabledAt
    })
  };
}

export async function disableSkill(input: { skill: SkillSummary; targetID: string; targetType?: TargetType }): Promise<{ event: LocalEvent }> {
  const invoke = getInvoke();
  const existing = input.skill.enabledTargets.find(
    (target) => target.targetID === input.targetID && (!input.targetType || target.targetType === input.targetType)
  );
  if (invoke) {
    return callLocalCommand(invoke, P1_LOCAL_COMMANDS.disableSkill, {
      ...buildDisableSkillArgs({
        skillID: input.skill.skillID,
        targetType: existing?.targetType ?? input.targetType ?? "tool",
        targetID: input.targetID
      })
    }, "停用 Skill");
  }
  if (isBrowserPreviewMode()) {
    throw pendingLocalCommand("disable_skill");
  }
  if (!allowTauriMocks) {
    await requireInvoke();
  }
  await mockWait(180);
  return {
    event: buildLocalEvent({
      eventType: "disable_result",
      skill: input.skill,
      targetType: existing?.targetType ?? input.targetType ?? "tool",
      targetID: input.targetID,
      targetPath: existing?.targetPath ?? input.targetID,
      requestedMode: existing?.requestedMode ?? "symlink",
      resolvedMode: existing?.resolvedMode ?? "symlink",
      fallbackReason: existing?.fallbackReason ?? null,
      occurredAt: new Date().toISOString()
    })
  };
}
