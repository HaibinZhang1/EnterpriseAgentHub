import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogIn, LogOut, Settings2, Shield, Wifi, WifiOff } from "lucide-react";
import { useP1Workspace } from "../state/useP1Workspace.ts";
import { type TopLevelSection, useDesktopUIState } from "../state/useDesktopUIState.ts";
import { roleLabel } from "./desktopShared.tsx";
import { NotificationPopover } from "./NotificationPopover.tsx";
import { CommunitySection, HomeSection, LocalSection, ManageSection, SkillDetailStage } from "./desktopSections.tsx";
import { DesktopOverlays, FlashToast } from "./desktopOverlays.tsx";

const sectionLabels: Record<TopLevelSection, string> = {
  home: "主页",
  community: "社区",
  local: "本地",
  manage: "管理"
};

function TopbarNotifications({ ui }: { ui: ReturnType<typeof useDesktopUIState> }) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    function handlePointerDown(event: MouseEvent) {
      if (shellRef.current && !shellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="topbar-popover-shell" ref={shellRef}>
      <button
        className={open ? "icon-button notification-bell active" : "icon-button notification-bell"}
        type="button"
        aria-label="打开通知"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} />
        {ui.notificationBadge ? <span className="notification-badge">{ui.notificationBadge}</span> : null}
      </button>
      {open ? <NotificationPopover ui={ui} onSelect={(notification) => { setOpen(false); void ui.openDesktopNotification(notification); }} /> : null}
    </div>
  );
}

function AvatarMenu({ workspace, ui }: { workspace: ReturnType<typeof useP1Workspace>; ui: ReturnType<typeof useDesktopUIState> }) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    function handlePointerDown(event: MouseEvent) {
      if (shellRef.current && !shellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="topbar-popover-shell" ref={shellRef}>
      <button className={open ? "avatar-button active" : "avatar-button"} type="button" onClick={() => setOpen((current) => !current)}>
        <span className="avatar-dot">{workspace.currentUser.displayName.slice(0, 2).toUpperCase()}</span>
        <span className="avatar-copy">
          <strong>{workspace.currentUser.displayName}</strong>
          <small>{roleLabel(workspace.currentUser, ui.language)}</small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div className="avatar-menu">
          <button className="menu-row" type="button" onClick={() => { setOpen(false); ui.openConnectionStatus(); }}>
            {workspace.loggedIn && workspace.bootstrap.connection.status === "connected" ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>{workspace.loggedIn ? "连接状态" : "本地模式"}</span>
          </button>
          <button className="menu-row" type="button" onClick={() => { setOpen(false); ui.openSettingsModal(); }}>
            <Settings2 size={15} />
            <span>设置</span>
          </button>
          {workspace.isAdminConnected ? (
            <button className="menu-row" type="button" onClick={() => { setOpen(false); ui.openManagePane("reviews"); }}>
              <Shield size={15} />
              <span>进入管理</span>
            </button>
          ) : null}
          {workspace.loggedIn ? (
            <button className="menu-row" type="button" onClick={() => { setOpen(false); void workspace.logout(); }}>
              <LogOut size={15} />
              <span>退出登录</span>
            </button>
          ) : (
            <button className="menu-row" type="button" onClick={() => { setOpen(false); workspace.setLoginModalOpen(true); }}>
              <LogIn size={15} />
              <span>登录</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DesktopApp() {
  const workspace = useP1Workspace();
  const ui = useDesktopUIState(workspace);

  return (
    <div className="desktop-shell">
      <header className="desktop-topbar">
        <div className="brand-lockup">
          <button className="brand-badge" type="button" onClick={ui.goHome} aria-label="回到主页">
            A
          </button>
          <div className="brand-copy">
            <strong>Enterprise Agent Hub</strong>
            <span>Desktop Skills Workspace</span>
          </div>
        </div>

        <nav className="segment-nav" aria-label="一级导航">
          {ui.navigationSections.map((section) => (
            <button
              key={section}
              className={ui.activeSection === section ? "segment-button active" : "segment-button"}
              type="button"
              onClick={() => ui.navigateSection(section)}
            >
              {sectionLabels[section]}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <TopbarNotifications ui={ui} />
          <AvatarMenu workspace={workspace} ui={ui} />
        </div>
      </header>

      <main className="desktop-stage">
        {ui.skillDetail ? (
          <SkillDetailStage workspace={workspace} ui={ui} detail={ui.skillDetail} />
        ) : (
          <>
            {ui.activeSection === "home" ? <HomeSection workspace={workspace} ui={ui} /> : null}
            {ui.activeSection === "community" ? <CommunitySection workspace={workspace} ui={ui} /> : null}
            {ui.activeSection === "local" ? <LocalSection workspace={workspace} ui={ui} /> : null}
            {ui.activeSection === "manage" ? <ManageSection workspace={workspace} ui={ui} /> : null}
          </>
        )}
      </main>

      <DesktopOverlays workspace={workspace} ui={ui} />
      <FlashToast flash={ui.flash} onClear={ui.clearFlash} />
    </div>
  );
}
