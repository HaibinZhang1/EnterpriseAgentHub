import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  BootstrapContext,
  LocalBootstrap,
  LocalNotification,
  OperationProgress,
  RequestedMode,
  ScanTargetSummary,
  SkillSummary,
  TargetType
} from "../../domain/p1";
import { p1Client } from "../../services/p1Client";
import { desktopBridge } from "../../services/tauriBridge";
import {
  applyLocalInstallToSkill,
  applySkill,
  notificationFromProgress
} from "../p1WorkspaceHelpers";
import type { RequireAuthenticatedAction } from "./workspaceTypes";
import { defaultFilters } from "./workspaceTypes";

export function useWorkspaceMarketState() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedSkillID, setSelectedSkillID] = useState("");
  const [progress, setProgress] = useState<OperationProgress | null>(null);

  const selectSkill = useCallback((skillID: string) => {
    setSelectedSkillID(skillID);
  }, []);

  const updateSkillProgress = useCallback((nextProgress: OperationProgress) => {
    setProgress(nextProgress);
  }, []);

  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    clearProgress,
    filters,
    progress,
    selectSkill,
    selectedSkillID,
    setFilters,
    setProgress,
    setSelectedSkillID,
    setSkills,
    skills,
    updateSkillProgress
  };
}

export function useWorkspaceMarketActions(input: {
  bootstrap: BootstrapContext;
  persistNotifications: (incoming: LocalNotification[]) => Promise<void>;
  refreshLocalBootstrap: () => Promise<LocalBootstrap>;
  refreshLocalScans: () => Promise<ScanTargetSummary[]>;
  requireAuthenticatedAction: RequireAuthenticatedAction;
  setOfflineEvents: Dispatch<SetStateAction<LocalBootstrap["offlineEvents"]>>;
  setSkills: Dispatch<SetStateAction<SkillSummary[]>>;
  skills: SkillSummary[];
  updateSkillProgress: (nextProgress: OperationProgress) => void;
}) {
  const {
    bootstrap,
    persistNotifications,
    refreshLocalBootstrap,
    refreshLocalScans,
    requireAuthenticatedAction,
    setOfflineEvents,
    setSkills,
    skills,
    updateSkillProgress
  } = input;

  const performInstallOrUpdate = useCallback(
    async (skillID: string, operation: "install" | "update") => {
      const skill = skills.find((item) => item.skillID === skillID);
      if (!skill) return;
      if (bootstrap.connection.status !== "connected") {
        updateSkillProgress({ operation, skillID, stage: "blocked_offline", result: "failed", message: "离线模式下不能安装或更新市场 Skill。" });
        return;
      }
      const stages = ["获取下载凭证", "下载包", "校验大小和文件数", "校验 SHA-256", "写入 Central Store"];
      for (const stage of stages) {
        updateSkillProgress({ operation, skillID, stage, result: "running", message: stage });
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      const downloadTicket = await p1Client.downloadTicket(skill, operation);
      const result = operation === "install" ? await desktopBridge.installSkillPackage(downloadTicket) : await desktopBridge.updateSkillPackage(downloadTicket);
      const localBootstrap = await refreshLocalBootstrap();
      await refreshLocalScans();
      setSkills((current) => applySkill(current, skillID, (item) => applyLocalInstallToSkill(item, result)));
      setOfflineEvents(localBootstrap.offlineEvents);
      const nextProgress: OperationProgress = {
        operation,
        skillID,
        stage: "完成",
        result: "success",
        message: `${skill.displayName} 已写入 Central Store，原启用位置不会被自动覆盖。`
      };
      updateSkillProgress(nextProgress);
      await persistNotifications([notificationFromProgress(nextProgress)]);
    },
    [bootstrap.connection.status, persistNotifications, refreshLocalBootstrap, refreshLocalScans, setOfflineEvents, setSkills, skills, updateSkillProgress]
  );

  const installOrUpdate = useCallback(
    async (skillID: string, operation: "install" | "update") => {
      requireAuthenticatedAction("market", async () => {
        await performInstallOrUpdate(skillID, operation);
      });
    },
    [performInstallOrUpdate, requireAuthenticatedAction]
  );

  const enableSkill = useCallback(
    async (skillID: string, targetType: TargetType, targetID: string, requestedMode: RequestedMode = "symlink", allowOverwrite = false) => {
      const skill = skills.find((item) => item.skillID === skillID);
      if (!skill || !skill.localVersion || skill.isScopeRestricted) return;
      updateSkillProgress({ operation: "enable", skillID, stage: "目标转换与写入", result: "running", message: "正在调用 Tauri Adapter 启用 Skill。" });
      const result = await desktopBridge.enableSkill({ skill, targetType, targetID, requestedMode, allowOverwrite });
      const localBootstrap = await refreshLocalBootstrap();
      await refreshLocalScans();
      setSkills((current) =>
        applySkill(current, skillID, (item) => ({
          ...item,
          installState: "enabled",
          enabledTargets: [
            ...item.enabledTargets.filter((target) => !(target.targetID === targetID && target.targetType === targetType)),
            result.target
          ],
          lastEnabledAt: result.target.enabledAt
        }))
      );
      setOfflineEvents(localBootstrap.offlineEvents);
      const nextProgress: OperationProgress = {
        operation: "enable",
        skillID,
        stage: "完成",
        result: "success",
        message: `${skill.displayName} 已启用到 ${result.target.targetName}`
      };
      updateSkillProgress(nextProgress);
      await persistNotifications([notificationFromProgress(nextProgress, result.target.fallbackReason)]);
    },
    [persistNotifications, refreshLocalBootstrap, refreshLocalScans, setOfflineEvents, setSkills, skills, updateSkillProgress]
  );

  const disableSkill = useCallback(
    async (skillID: string, targetID: string, targetType?: TargetType) => {
      const skill = skills.find((item) => item.skillID === skillID);
      if (!skill) return;
      updateSkillProgress({ operation: "disable", skillID, stage: "移除托管目标", result: "running", message: "正在停用目标；不会删除 Central Store。" });
      const result = await desktopBridge.disableSkill({ skill, targetID, targetType });
      const localBootstrap = await refreshLocalBootstrap();
      await refreshLocalScans();
      setSkills((current) =>
        applySkill(current, skillID, (item) => {
          const enabledTargets = item.enabledTargets.filter(
            (target) => !(target.targetID === targetID && (!targetType || target.targetType === targetType))
          );
          return { ...item, enabledTargets, installState: enabledTargets.length > 0 ? "enabled" : "installed" };
        })
      );
      setOfflineEvents(localBootstrap.offlineEvents);
      const nextProgress: OperationProgress = { operation: "disable", skillID, stage: "完成", result: "success", message: `${skill.displayName} 已从目标停用。` };
      updateSkillProgress(nextProgress);
      await persistNotifications([notificationFromProgress(nextProgress)]);
    },
    [persistNotifications, refreshLocalBootstrap, refreshLocalScans, setOfflineEvents, setSkills, skills, updateSkillProgress]
  );

  const uninstallSkill = useCallback(
    async (skillID: string) => {
      const skill = skills.find((item) => item.skillID === skillID);
      if (!skill) return;
      updateSkillProgress({ operation: "uninstall", skillID, stage: "确认引用并删除", result: "running", message: "正在通过 Store 命令删除 Central Store 与托管目标。" });
      const result = await desktopBridge.uninstallSkill(skillID);
      const localBootstrap = await refreshLocalBootstrap();
      await refreshLocalScans();
      setSkills((current) =>
        applySkill(current, skillID, (item) => ({ ...item, localVersion: null, installState: "not_installed", enabledTargets: [], lastEnabledAt: null }))
      );
      setOfflineEvents(localBootstrap.offlineEvents);
      const nextProgress: OperationProgress = {
        operation: "uninstall",
        skillID,
        stage: "完成",
        result: result.failedTargetIDs.length === 0 ? "success" : "failed",
        message:
          result.failedTargetIDs.length === 0
            ? `${skill.displayName} 已卸载。`
            : `${skill.displayName} 已卸载，但仍有 ${result.failedTargetIDs.length} 个目标需要手动清理。`
      };
      updateSkillProgress(nextProgress);
      await persistNotifications([notificationFromProgress(nextProgress)]);
    },
    [persistNotifications, refreshLocalBootstrap, refreshLocalScans, setOfflineEvents, setSkills, skills, updateSkillProgress]
  );

  const toggleStar = useCallback(
    async (skillID: string) => {
      requireAuthenticatedAction("market", async () => {
        const skill = skills.find((item) => item.skillID === skillID);
        if (!skill) return;
        const result = await p1Client.star(skillID, !skill.starred);
        setSkills((current) => applySkill(current, skillID, (item) => ({ ...item, starred: result.starred, starCount: result.starCount })));
      });
    },
    [requireAuthenticatedAction, setSkills, skills]
  );

  return {
    disableSkill,
    enableSkill,
    installOrUpdate,
    performInstallOrUpdate,
    toggleStar,
    uninstallSkill
  };
}
