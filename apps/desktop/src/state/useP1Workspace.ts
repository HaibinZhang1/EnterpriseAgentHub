import { useCallback, useEffect, useMemo } from "react";
import type { LocalBootstrap, PageID } from "../domain/p1";
import { isPermissionError, isUnauthenticatedError, p1Client } from "../services/p1Client";
import { desktopBridge } from "../services/tauriBridge";
import {
  buildGuestBootstrap,
  localSummaryFromInstall,
  mergeLocalInstalls,
  mergeNotifications
} from "./p1WorkspaceHelpers";
import { useWorkspaceAdminReviewActions, useWorkspaceAdminReviewState } from "./workspace/useWorkspaceAdminReview";
import { useWorkspaceAuthState } from "./workspace/useWorkspaceAuth";
import { useWorkspaceLocalSyncActions, useWorkspaceLocalSyncState } from "./workspace/useWorkspaceLocalSync";
import { useWorkspaceMarketActions, useWorkspaceMarketState } from "./workspace/useWorkspaceMarket";
import { useWorkspacePublisherActions, useWorkspacePublisherState } from "./workspace/useWorkspacePublisher";
import { deriveWorkspaceState } from "./workspace/workspaceDerivedState";

export function useP1Workspace() {
  const auth = useWorkspaceAuthState();
  const localSync = useWorkspaceLocalSyncState();
  const market = useWorkspaceMarketState();
  const publisher = useWorkspacePublisherState();
  const adminReview = useWorkspaceAdminReviewState();

  const remoteMarketFilters = useMemo(
    () => ({ ...market.filters, installed: "all" as const, enabled: "all" as const }),
    [market.filters]
  );

  const derived = useMemo(
    () =>
      deriveWorkspaceState({
        authState: auth.authState,
        bootstrap: auth.bootstrap,
        departments: adminReview.departments,
        filters: market.filters,
        notifications: localSync.notifications,
        scanTargets: localSync.scanTargets,
        selectedDepartmentID: adminReview.selectedDepartmentID,
        selectedSkillID: market.selectedSkillID,
        skills: market.skills
      }),
    [
      adminReview.departments,
      adminReview.selectedDepartmentID,
      auth.authState,
      auth.bootstrap,
      localSync.notifications,
      localSync.scanTargets,
      market.filters,
      market.selectedSkillID,
      market.skills
    ]
  );

  const moveToGuest = useCallback(
    async (message?: string) => {
      const localBootstrap = localSync.localBootstrapRef.current ?? (await localSync.refreshLocalBootstrap());
      const localScanTargets = await desktopBridge.scanLocalTargets().catch(() => []);
      const localSkills = localBootstrap.installs.map(localSummaryFromInstall);
      auth.setAuthState("guest");
      auth.setBootstrap(buildGuestBootstrap(localBootstrap, message));
      market.setSkills(localSkills);
      localSync.setOfflineEvents(localBootstrap.offlineEvents);
      localSync.setScanTargets(localScanTargets);
      localSync.setNotifications(localBootstrap.notifications);
      publisher.resetPublisherState();
      adminReview.resetAdminReviewState();
      market.setSelectedSkillID((current) => (localSkills.some((skill) => skill.skillID === current) ? current : localSkills[0]?.skillID ?? ""));
      auth.setActivePageState((current) => (current === "manage" || current === "review" || current === "market" ? "home" : current));
    },
    [
      adminReview.resetAdminReviewState,
      auth.setActivePageState,
      auth.setAuthState,
      auth.setBootstrap,
      localSync.localBootstrapRef,
      localSync.refreshLocalBootstrap,
      localSync.setNotifications,
      localSync.setOfflineEvents,
      localSync.setScanTargets,
      market.setSelectedSkillID,
      market.setSkills,
      publisher.resetPublisherState
    ]
  );

  const handleRemoteError = useCallback(
    async (error: unknown, options: { reopenLogin?: boolean } = {}) => {
      if (isUnauthenticatedError(error)) {
        p1Client.clearStoredSession();
        await moveToGuest("登录已失效，请重新登录。");
        auth.setAuthError("登录已失效，请重新登录。");
        if (options.reopenLogin) {
          auth.setLoginModalOpen(true);
        }
        return true;
      }
      if (isPermissionError(error)) {
        auth.stripAdminCapabilities();
        market.setProgress({ operation: "update", skillID: "permission", stage: "权限变化", result: "failed", message: "当前账号已不具备该页面权限。" });
        return true;
      }
      const message = error instanceof Error ? error.message : "请求失败";
      market.setProgress({ operation: "update", skillID: "request", stage: "失败", result: "failed", message });
      return false;
    },
    [auth.setAuthError, auth.setLoginModalOpen, auth.stripAdminCapabilities, market.setProgress, moveToGuest]
  );

  const hydrateAuthenticatedState = useCallback(
    async (localBootstrap?: LocalBootstrap) => {
      const currentLocalBootstrap = localBootstrap ?? localSync.localBootstrapRef.current ?? (await localSync.refreshLocalBootstrap());
      const localScanTargets = await desktopBridge.scanLocalTargets().catch(() => []);
      localSync.localBootstrapRef.current = currentLocalBootstrap;
      const [remoteBootstrap, remoteSkills, remoteNotifications] = await Promise.all([
        p1Client.bootstrap(),
        p1Client.listSkills(remoteMarketFilters),
        p1Client.listNotifications()
      ]);
      await desktopBridge.upsertLocalNotifications(remoteNotifications).catch(() => undefined);
      const mergedSkills = mergeLocalInstalls(remoteSkills, currentLocalBootstrap);
      const mergedNotifications = mergeNotifications(remoteNotifications, currentLocalBootstrap.notifications);
      auth.setAuthState("authenticated");
      auth.setBootstrap(remoteBootstrap);
      market.setSkills(mergedSkills);
      localSync.setTools(currentLocalBootstrap.tools);
      localSync.setProjects(currentLocalBootstrap.projects);
      localSync.setOfflineEvents(currentLocalBootstrap.offlineEvents);
      localSync.setScanTargets(localScanTargets);
      localSync.setNotifications(mergedNotifications);
      market.setSelectedSkillID((current) => (mergedSkills.some((skill) => skill.skillID === current) ? current : mergedSkills[0]?.skillID ?? ""));
      return remoteBootstrap;
    },
    [
      auth.setAuthState,
      auth.setBootstrap,
      localSync.localBootstrapRef,
      localSync.refreshLocalBootstrap,
      localSync.setNotifications,
      localSync.setOfflineEvents,
      localSync.setProjects,
      localSync.setScanTargets,
      localSync.setTools,
      market.setSelectedSkillID,
      market.setSkills,
      remoteMarketFilters
    ]
  );

  const queueLogin = auth.queueLogin;

  const openPage = useCallback(
    (page: PageID) => {
      if (page === "market" && auth.authState !== "authenticated") {
        queueLogin(page);
        return;
      }
      if (page === "manage" || page === "review") {
        if (auth.authState !== "authenticated") {
          queueLogin(page);
          return;
        }
        if (!derived.visibleNavigation.includes(page)) {
          auth.setActivePageState("home");
          return;
        }
      }
      auth.setActivePageState(page);
    },
    [auth.authState, auth.setActivePageState, derived.visibleNavigation, queueLogin]
  );

  const requireAuthenticatedAction = useCallback(
    (page: PageID | null, action: () => Promise<void> | void) => {
      if (auth.authState !== "authenticated") {
        queueLogin(page, action);
        return false;
      }
      void Promise.resolve(action()).catch((error) => void handleRemoteError(error, { reopenLogin: true }));
      return true;
    },
    [auth.authState, handleRemoteError, queueLogin]
  );

  const marketActions = useWorkspaceMarketActions({
    bootstrap: auth.bootstrap,
    persistNotifications: localSync.persistNotifications,
    refreshLocalBootstrap: localSync.refreshLocalBootstrap,
    refreshLocalScans: localSync.refreshLocalScans,
    requireAuthenticatedAction,
    setOfflineEvents: localSync.setOfflineEvents,
    setSkills: market.setSkills,
    skills: market.skills,
    updateSkillProgress: market.updateSkillProgress
  });

  const localActions = useWorkspaceLocalSyncActions({
    authState: auth.authState,
    bootstrap: auth.bootstrap,
    handleRemoteError,
    notifications: localSync.notifications,
    offlineEvents: localSync.offlineEvents,
    persistNotifications: localSync.persistNotifications,
    refreshLocalBootstrap: localSync.refreshLocalBootstrap,
    refreshLocalScans: localSync.refreshLocalScans,
    requireAuthenticatedAction,
    setNotifications: localSync.setNotifications,
    setOfflineEvents: localSync.setOfflineEvents,
    setProjects: localSync.setProjects,
    setTools: localSync.setTools
  });

  const publisherActions = useWorkspacePublisherActions({
    activePage: auth.activePage,
    authState: auth.authState,
    handleRemoteError,
    requireAuthenticatedAction,
    selectedPublisherSubmissionID: publisher.selectedPublisherSubmissionID,
    setPublisherSkills: publisher.setPublisherSkills,
    setSelectedPublisherSubmission: publisher.setSelectedPublisherSubmission,
    setSelectedPublisherSubmissionID: publisher.setSelectedPublisherSubmissionID
  });

  const adminActions = useWorkspaceAdminReviewActions({
    activePage: auth.activePage,
    authState: auth.authState,
    handleRemoteError,
    requireAuthenticatedAction,
    selectedReviewID: adminReview.selectedReviewID,
    setAdminSkills: adminReview.setAdminSkills,
    setAdminUsers: adminReview.setAdminUsers,
    setDepartments: adminReview.setDepartments,
    setReviews: adminReview.setReviews,
    setSelectedDepartmentID: adminReview.setSelectedDepartmentID,
    setSelectedReview: adminReview.setSelectedReview,
    setSelectedReviewID: adminReview.setSelectedReviewID
  });

  useEffect(() => {
    let cancelled = false;

    async function initializeWorkspace() {
      const localBootstrap = await localSync.refreshLocalBootstrap();
      const localScanTargets = await desktopBridge.scanLocalTargets().catch(() => []);
      if (cancelled) return;
      const localSkills = localBootstrap.installs.map(localSummaryFromInstall);
      auth.setBootstrap(buildGuestBootstrap(localBootstrap));
      market.setSkills(localSkills);
      localSync.setNotifications(localBootstrap.notifications);
      localSync.setOfflineEvents(localBootstrap.offlineEvents);
      localSync.setScanTargets(localScanTargets);
      market.setSelectedSkillID(localSkills[0]?.skillID ?? "");

      if (p1Client.hasStoredSession()) {
        auth.setBootstrap((current) => ({
          ...current,
          connection: { ...current.connection, status: "connecting", lastError: "正在恢复登录状态..." }
        }));
        try {
          await hydrateAuthenticatedState(localBootstrap);
        } catch (error) {
          if (cancelled) return;
          if (isUnauthenticatedError(error)) {
            p1Client.clearStoredSession();
          }
          const message = error instanceof Error ? error.message : "当前处于离线模式。";
          auth.setBootstrap(buildGuestBootstrap(localBootstrap, message));
          auth.setAuthState("guest");
        }
      }
    }

    void initializeWorkspace();
    return () => {
      cancelled = true;
    };
  }, [
    auth.setAuthState,
    auth.setBootstrap,
    hydrateAuthenticatedState,
    localSync.refreshLocalBootstrap,
    localSync.setNotifications,
    localSync.setOfflineEvents,
    localSync.setScanTargets,
    market.setSelectedSkillID,
    market.setSkills
  ]);

  useEffect(() => {
    if (auth.authState !== "authenticated" || auth.bootstrap.connection.status !== "connected") return;
    let cancelled = false;

    void p1Client
      .listSkills(remoteMarketFilters)
      .then((remoteSkills) => {
        if (cancelled) return;
        const localBootstrap = localSync.localBootstrapRef.current;
        const mergedSkills = localBootstrap ? mergeLocalInstalls(remoteSkills, localBootstrap) : remoteSkills;
        market.setSkills(mergedSkills);
        market.setSelectedSkillID((current) => (mergedSkills.some((skill) => skill.skillID === current) ? current : mergedSkills[0]?.skillID ?? ""));
      })
      .catch((error) => void handleRemoteError(error));

    return () => {
      cancelled = true;
    };
  }, [
    auth.authState,
    auth.bootstrap.connection.status,
    handleRemoteError,
    localSync.localBootstrapRef,
    market.setSelectedSkillID,
    market.setSkills,
    remoteMarketFilters
  ]);

  useEffect(() => {
    if (auth.activePage === "manage" && !derived.visibleNavigation.includes("manage")) {
      auth.setActivePageState("home");
    }
    if (auth.activePage === "review" && !derived.visibleNavigation.includes("review")) {
      auth.setActivePageState("home");
    }
  }, [auth.activePage, auth.setActivePageState, derived.visibleNavigation]);

  useEffect(() => {
    if (auth.authState !== "authenticated" || auth.bootstrap.connection.status !== "connected") return;
    if (auth.activePage === "manage" && auth.bootstrap.menuPermissions.includes("manage")) {
      void adminActions.refreshManageData().catch((error) => void handleRemoteError(error));
    }
    if (auth.activePage === "my_installed" && auth.bootstrap.features.publishSkill) {
      void publisherActions.refreshPublisherData().catch((error) => void handleRemoteError(error));
    }
    if (auth.activePage === "review" && auth.bootstrap.menuPermissions.includes("review")) {
      void adminActions.refreshReviews().catch((error) => void handleRemoteError(error));
    }
  }, [
    adminActions.refreshManageData,
    adminActions.refreshReviews,
    auth.activePage,
    auth.authState,
    auth.bootstrap.connection.status,
    auth.bootstrap.features.publishSkill,
    auth.bootstrap.menuPermissions,
    handleRemoteError,
    publisherActions.refreshPublisherData
  ]);

  const login = useCallback(
    async (input: { username: string; password: string; serverURL: string }) => {
      auth.setAuthError(null);
      try {
        const localBootstrap = localSync.localBootstrapRef.current ?? (await localSync.refreshLocalBootstrap());
        localSync.localBootstrapRef.current = localBootstrap;
        await p1Client.login(input);
        await hydrateAuthenticatedState(localBootstrap);
        auth.setLoginModalOpen(false);
        const pending = auth.consumePendingLogin("home");
        auth.setActivePageState(pending.page);
        if (pending.action) {
          await pending.action();
        }
      } catch (error) {
        auth.setAuthError(error instanceof Error ? error.message : "登录失败");
      }
    },
    [
      auth.consumePendingLogin,
      auth.setActivePageState,
      auth.setAuthError,
      auth.setLoginModalOpen,
      hydrateAuthenticatedState,
      localSync.localBootstrapRef,
      localSync.refreshLocalBootstrap
    ]
  );

  const logout = useCallback(async () => {
    await p1Client.logout();
    auth.clearPendingLogin();
    auth.setLoginModalOpen(false);
    auth.setAuthError(null);
    await moveToGuest("已切换到本地模式。");
  }, [auth.clearPendingLogin, auth.setAuthError, auth.setLoginModalOpen, moveToGuest]);

  const refreshBootstrap = useCallback(async () => {
    if (auth.authState !== "authenticated") {
      queueLogin(auth.activePage);
      return;
    }
    try {
      await hydrateAuthenticatedState();
    } catch (error) {
      await handleRemoteError(error, { reopenLogin: true });
    }
  }, [auth.activePage, auth.authState, handleRemoteError, hydrateAuthenticatedState, queueLogin]);

  const openSkill = useCallback(
    (skillID: string) => {
      market.setSelectedSkillID(skillID);
      openPage("market");
    },
    [market.setSelectedSkillID, openPage]
  );

  return {
    authState: auth.authState,
    loggedIn: auth.authState === "authenticated",
    loginModalOpen: auth.loginModalOpen,
    setLoginModalOpen: auth.setLoginModalOpen,
    bootstrap: { ...auth.bootstrap, counts: derived.counts },
    activePage: auth.activePage,
    setActivePage: openPage,
    openPage,
    visibleNavigation: derived.visibleNavigation,
    skills: market.skills,
    marketSkills: derived.marketSkills,
    installedSkills: derived.installedSkills,
    discoveredLocalSkills: derived.discoveredLocalSkills,
    selectedSkill: derived.selectedSkill,
    selectedSkillID: market.selectedSkillID,
    selectSkill: market.selectSkill,
    openSkill,
    tools: localSync.tools,
    projects: localSync.projects,
    localCentralStorePath: localSync.localCentralStorePath,
    scanTargets: localSync.scanTargets,
    notifications: localSync.notifications,
    offlineEvents: localSync.offlineEvents,
    filters: market.filters,
    setFilters: market.setFilters,
    departments: derived.departmentsFilter,
    compatibleTools: derived.compatibleTools,
    categories: derived.categories,
    progress: market.progress,
    clearProgress: market.clearProgress,
    authError: auth.authError,
    login,
    logout,
    refreshBootstrap,
    installOrUpdate: marketActions.installOrUpdate,
    enableSkill: marketActions.enableSkill,
    disableSkill: marketActions.disableSkill,
    uninstallSkill: marketActions.uninstallSkill,
    saveToolConfig: localActions.saveToolConfig,
    saveProjectConfig: localActions.saveProjectConfig,
    toggleStar: marketActions.toggleStar,
    markNotificationsRead: localActions.markNotificationsRead,
    syncOfflineEvents: localActions.syncOfflineEvents,
    refreshTools: localActions.refreshTools,
    scanLocalTargets: localActions.scanLocalTargets,
    validateTargetPath: localActions.validateTargetPath,
    pickProjectDirectory: localActions.pickProjectDirectory,
    requireAuth: queueLogin,
    apiBaseURL: p1Client.currentAPIBase(),
    currentUser: auth.bootstrap.user,
    isAdminConnected: derived.isAdminConnected,
    publisherData: {
      publisherSkills: publisher.publisherSkills,
      selectedPublisherSubmission: publisher.selectedPublisherSubmission,
      selectedPublisherSubmissionID: publisher.selectedPublisherSubmissionID,
      setSelectedPublisherSubmissionID: publisher.setSelectedPublisherSubmissionID,
      refreshPublisherData: publisherActions.refreshPublisherData,
      submitPublisherSubmission: publisherActions.submitPublisherSubmission,
      withdrawPublisherSubmission: publisherActions.withdrawPublisherSubmission,
      delistPublisherSkill: publisherActions.delistPublisherSkill,
      relistPublisherSkill: publisherActions.relistPublisherSkill,
      archivePublisherSkill: publisherActions.archivePublisherSkill,
      listSubmissionFiles: publisherActions.listPublisherSubmissionFiles,
      getSubmissionFileContent: publisherActions.getPublisherSubmissionFileContent
    },
    adminData: {
      departments: adminReview.departments,
      selectedDepartment: derived.selectedDepartment,
      setSelectedDepartmentID: adminReview.setSelectedDepartmentID,
      adminUsers: adminReview.adminUsers,
      adminSkills: adminReview.adminSkills,
      reviews: adminReview.reviews,
      selectedReview: adminReview.selectedReview,
      selectedReviewID: adminReview.selectedReviewID,
      setSelectedReviewID: adminReview.setSelectedReviewID,
      manageSection: adminReview.manageSection,
      setManageSection: adminReview.setManageSection,
      refreshManageData: adminActions.refreshManageData,
      refreshReviews: adminActions.refreshReviews,
      claimReview: adminActions.claimReview,
      passPrecheck: adminActions.passPrecheck,
      approveReview: adminActions.approveReview,
      returnReview: adminActions.returnReview,
      rejectReview: adminActions.rejectReview,
      listReviewFiles: adminActions.listReviewFiles,
      getReviewFileContent: adminActions.getReviewFileContent,
      createDepartment: adminActions.createDepartment,
      updateDepartment: adminActions.updateDepartment,
      deleteDepartment: adminActions.deleteDepartment,
      createAdminUser: adminActions.createAdminUser,
      updateAdminUser: adminActions.updateAdminUser,
      freezeAdminUser: adminActions.freezeAdminUser,
      unfreezeAdminUser: adminActions.unfreezeAdminUser,
      deleteAdminUser: adminActions.deleteAdminUser,
      delistAdminSkill: adminActions.delistAdminSkill,
      relistAdminSkill: adminActions.relistAdminSkill,
      archiveAdminSkill: adminActions.archiveAdminSkill
    }
  };
}

export type P1WorkspaceState = ReturnType<typeof useP1Workspace>;
