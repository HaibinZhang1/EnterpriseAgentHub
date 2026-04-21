import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, CircleUserRound, LogIn, LogOut, Minus, Settings2, Square, X } from "lucide-react";
import { useP1Workspace } from "../state/useP1Workspace.ts";
import { type TopLevelSection, useDesktopUIState } from "../state/useDesktopUIState.ts";
import { localize, roleLabel } from "./desktopShared.tsx";
import { iconToneForLabel } from "./iconTone.ts";
import { NotificationPopover } from "./NotificationPopover.tsx";
import { CommunitySection, HomeSection, LocalSection, ManageSection } from "./desktopSections.tsx";
import { DesktopOverlays, FlashToast } from "./desktopOverlays.tsx";
import { getInvoke } from "../services/tauriBridge/runtime.ts";

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
  const roleText =
    workspace.loggedIn && workspace.bootstrap.connection.status !== "connected"
      ? localize(ui.language, "离线待验权", "Offline Pending Verification")
      : roleLabel(workspace.currentUser, ui.language);
  const connectionTone = workspace.loggedIn && workspace.bootstrap.connection.status === "connected" ? "connected" : "offline";
  const connectionLabel =
    workspace.loggedIn && workspace.bootstrap.connection.status === "connected"
      ? localize(ui.language, "已连接", "Connected")
      : workspace.loggedIn
        ? localize(ui.language, "离线", "Offline")
        : localize(ui.language, "本地", "Local");

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
        className={open ? "avatar-button active" : "avatar-button"}
        type="button"
        data-testid={!workspace.loggedIn ? "open-login" : undefined}
        onClick={() => {
          if (!workspace.loggedIn) {
            workspace.setLoginModalOpen(true);
            return;
          }
          setOpen((current) => !current);
        }}
      >
        <span className={`avatar-dot icon-tone-${iconToneForLabel(workspace.currentUser.username)}`}>
          {workspace.currentUser.username.slice(0, 2).toUpperCase()}
        </span>
        <span className="avatar-copy">
          <strong>{workspace.currentUser.username}</strong>
          <small className="avatar-subline">
            <span className={`avatar-status-dot ${connectionTone}`} />
            {roleText}
          </small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div className="avatar-menu" aria-label="账号菜单">
          <div className="avatar-menu-profile">
            <span className={`avatar-dot icon-tone-${iconToneForLabel(workspace.currentUser.username)}`}>
              {workspace.currentUser.username.slice(0, 2).toUpperCase()}
            </span>
            <span className="avatar-menu-copy">
              <strong>{workspace.currentUser.username}</strong>
              <small>{roleText}</small>
              <small>{workspace.currentUser.departmentName}</small>
            </span>
            <em className={`avatar-menu-status ${connectionTone}`}>{connectionLabel}</em>
          </div>
          <div className="avatar-menu-separator" />
          <button className="menu-row account-menu-row" type="button" onClick={() => { setOpen(false); ui.openConnectionStatus(); }}>
            <span className="menu-row-icon"><CircleUserRound size={15} /></span>
            <span className="menu-row-copy">
              <strong>我的信息</strong>
              <small>身份、部门与服务状态</small>
            </span>
          </button>
          <button className="menu-row account-menu-row" type="button" onClick={() => { setOpen(false); ui.openSettingsModal(); }}>
            <span className="menu-row-icon"><Settings2 size={15} /></span>
            <span className="menu-row-copy">
              <strong>设置</strong>
              <small>偏好、凭据与本地环境</small>
            </span>
          </button>
          {workspace.loggedIn ? (
            <button className="menu-row account-menu-row" type="button" onClick={() => { setOpen(false); void workspace.logout(); }}>
              <span className="menu-row-icon"><LogOut size={15} /></span>
              <span className="menu-row-copy">
                <strong>退出登录</strong>
                <small>保留本地已安装数据</small>
              </span>
            </button>
          ) : (
            <button className="menu-row account-menu-row" type="button" onClick={() => { setOpen(false); workspace.setLoginModalOpen(true); }}>
              <span className="menu-row-icon"><LogIn size={15} /></span>
              <span className="menu-row-copy">
                <strong>登录</strong>
                <small>同步企业服务能力</small>
              </span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function WindowControls() {
  const minimize = () => {
    const invoke = getInvoke();
    if (invoke) void invoke("p1_window_minimize");
  };
  const maximize = () => {
    const invoke = getInvoke();
    if (invoke) void invoke("p1_window_maximize");
  };
  const close = () => {
    const invoke = getInvoke();
    if (invoke) void invoke("p1_window_close");
  };

  return (
    <div className="window-controls">
      <button className="window-control-button" type="button" onClick={minimize} aria-label="最小化">
        <Minus size={14} />
      </button>
      <button className="window-control-button" type="button" onClick={maximize} aria-label="最大化">
        <Square size={12} />
      </button>
      <button className="window-control-button close-button" type="button" onClick={close} aria-label="关闭">
        <X size={16} />
      </button>
    </div>
  );
}

function startWindowDragging() {
  const invoke = getInvoke();
  if (invoke) void invoke("p1_window_start_dragging");
}

export function DesktopApp() {
  const workspace = useP1Workspace();
  const ui = useDesktopUIState(workspace);

  return (
    <div className="desktop-shell">
      <header
        className="desktop-topbar"
        onPointerDown={(e) => {
          if (e.button !== 0) {
            return;
          }
          const target = e.target instanceof Element ? e.target : null;
          if (target?.closest("button, input, textarea, select, a, [role='button']")) {
            return;
          }
          startWindowDragging();
        }}
      >
        <div className="brand-lockup">
          <button className="brand-badge icon-tone-pine" type="button" onClick={ui.goHome} aria-label="回到主页">
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
              data-testid={section === "community" ? "nav-market" : section === "local" ? "nav-my_installed" : section === "manage" ? "nav-review" : undefined}
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
          <div className="topbar-divider" />
          <WindowControls />
        </div>
      </header>

      <main className="desktop-stage">
        {ui.activeSection === "home" ? <HomeSection workspace={workspace} ui={ui} /> : null}
        {ui.activeSection === "community" ? <CommunitySection workspace={workspace} ui={ui} /> : null}
        {ui.activeSection === "local" ? <LocalSection workspace={workspace} ui={ui} /> : null}
        {ui.activeSection === "manage" ? <ManageSection workspace={workspace} ui={ui} /> : null}
      </main>

      <DesktopOverlays workspace={workspace} ui={ui} />
      <FlashToast flash={ui.flash} onClear={ui.clearFlash} />
    </div>
  );
}
