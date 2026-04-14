import { useCallback, useRef, useState } from "react";
import type { AuthState, BootstrapContext, PageID } from "../../domain/p1";
import { guestBootstrap } from "../../fixtures/p1SeedData";

export function useWorkspaceAuthState() {
  const [authState, setAuthState] = useState<AuthState>("guest");
  const [bootstrap, setBootstrap] = useState<BootstrapContext>(guestBootstrap);
  const [activePage, setActivePageState] = useState<PageID>("home");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const pendingPageRef = useRef<PageID | null>(null);
  const pendingActionRef = useRef<null | (() => Promise<void> | void)>(null);

  const queueLogin = useCallback((page: PageID | null, action?: () => Promise<void> | void) => {
    pendingPageRef.current = page;
    pendingActionRef.current = action ?? null;
    setAuthError(null);
    setLoginModalOpen(true);
  }, []);

  const consumePendingLogin = useCallback((fallbackPage: PageID) => {
    const pending = {
      page: pendingPageRef.current ?? fallbackPage,
      action: pendingActionRef.current
    };
    pendingPageRef.current = null;
    pendingActionRef.current = null;
    return pending;
  }, []);

  const clearPendingLogin = useCallback(() => {
    pendingPageRef.current = null;
    pendingActionRef.current = null;
  }, []);

  const stripAdminCapabilities = useCallback(() => {
    setBootstrap((current) => ({
      ...current,
      features: {
        ...current.features,
        reviewWorkbench: false,
        adminManage: false
      },
      navigation: current.navigation.filter((page) => page !== "review" && page !== "manage"),
      menuPermissions: current.menuPermissions.filter((page) => page !== "review" && page !== "manage")
    }));
    setActivePageState((current) => (current === "manage" || current === "review" ? "home" : current));
  }, []);

  return {
    activePage,
    authError,
    authState,
    bootstrap,
    clearPendingLogin,
    consumePendingLogin,
    loginModalOpen,
    queueLogin,
    setActivePageState,
    setAuthError,
    setAuthState,
    setBootstrap,
    setLoginModalOpen,
    stripAdminCapabilities
  };
}
