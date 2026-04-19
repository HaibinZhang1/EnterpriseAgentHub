import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  FolderPlus,
  LogIn,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  WifiOff,
  X
} from "lucide-react";
import type { PublishDraft, PublisherSkillSummary, SkillSummary } from "../domain/p1.ts";
import type { DesktopUIState, FlashMessage, OverlayState, PublisherPane } from "../state/useDesktopUIState.ts";
import type { P1WorkspaceState } from "../state/useP1Workspace.ts";
import { buildPublishPrecheck } from "../state/ui/publishPrecheck.ts";
import { downloadAuthenticatedFile } from "../services/p1Client.ts";
import { defaultProjectSkillsPath, defaultToolConfigPath, defaultToolSkillsPath, previewCentralStorePath } from "../utils/platformPaths.ts";
import {
  flattenDepartments,
  formatDate,
  localize,
  publishVisibilityLabel,
  reviewActionLabel,
  riskLabel,
  scopeLabel,
  settingsLanguageLabel,
  skillInitials,
  statusLabel,
  statusTone,
  submissionTypeLabel,
  themeLabel,
  workflowStateLabel
} from "./desktopShared.tsx";
import { InitialBadge, PackagePreviewPanel, SectionEmpty, SelectField, TagPill } from "./pageCommon.tsx";

function OverlaySectionHeader({
  title,
  eyebrow,
  description
}: {
  title: string;
  eyebrow: string;
  description: string;
}) {
  return (
    <div className="section-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function OverlayPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function ModalFrame({
  title,
  eyebrow,
  children,
  onClose,
  narrow = false,
  full = false
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
  narrow?: boolean;
  full?: boolean;
}) {
  const className = full ? "overlay-panel full" : narrow ? "overlay-panel narrow" : "overlay-panel";
  return (
    <div className="overlay-backdrop" role="presentation" onClick={onClose}>
      <section className={className} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="overlay-head">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </section>
    </div>
  );
}

function defaultLoginForm(apiBaseURL: string) {
  return {
    serverURL: apiBaseURL,
    username: import.meta.env.DEV ? import.meta.env.VITE_P1_DEV_LOGIN_USERNAME ?? "" : "",
    password: import.meta.env.DEV ? import.meta.env.VITE_P1_DEV_LOGIN_PASSWORD ?? "" : ""
  };
}

function LoginModal({ workspace, ui }: { workspace: P1WorkspaceState; ui: DesktopUIState }) {
  const [form, setForm] = useState(() => defaultLoginForm(workspace.apiBaseURL));
  const [submitting, setSubmitting] = useState(false);
  const localDevSuggestion = "http://127.0.0.1:3001";
  const authErrorMessage = workspace.authError ?? "";
  const shouldSuggestLocalDevPort =
    Boolean(workspace.authError) &&
    form.serverURL.trim() !== localDevSuggestion &&
    (authErrorMessage.includes("请求超时") || authErrorMessage.includes("无法连接服务"));

  useEffect(() => {
    if (!workspace.loginModalOpen) return;
    setForm((current) => ({
      ...current,
      serverURL: workspace.apiBaseURL
    }));
    setSubmitting(false);
  }, [workspace.apiBaseURL, workspace.loginModalOpen]);

  if (!workspace.loginModalOpen) return null;

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await workspace.login(form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="登录企业服务" eyebrow="身份连接" onClose={() => workspace.setLoginModalOpen(false)} narrow>
      <div className="overlay-intro">
        <div className="detail-symbol-card overlay-symbol-card">
          <span className="overlay-symbol-mark">EA</span>
        </div>
        <div>
          <p className="overlay-intro-title">登录后同步市场、通知和权限</p>
          <p className="overlay-intro-copy">本地 Skill、工具和项目配置会继续保留，成功登录后会回到当前上下文继续操作。</p>
        </div>
      </div>
      <div className="pill-row">
        <TagPill tone="success">社区同步</TagPill>
        <TagPill tone="info">通知恢复</TagPill>
        <TagPill tone="neutral">本地配置保留</TagPill>
      </div>
      <div className="stack-list">
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>服务地址</span>
            <input
              name="serverURL"
              value={form.serverURL}
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="http://server.example.com"
              onChange={updateField}
            />
          </label>
          <label className="field">
            <span>用户名</span>
            <input
              name="username"
              value={form.username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="输入企业账号"
              onChange={updateField}
            />
          </label>
          <label className="field">
            <span>密码</span>
            <input
              name="password"
              type="password"
              value={form.password}
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={updateField}
            />
          </label>
          {workspace.authError ? (
            <div className="callout warning">
              <WifiOff size={16} />
              <span>
                <strong>{workspace.authError}</strong>
                {shouldSuggestLocalDevPort ? <small>当前本机开发环境可改用 {localDevSuggestion}</small> : null}
              </span>
            </div>
          ) : null}
          {shouldSuggestLocalDevPort ? (
            <button
              className="btn"
              type="button"
              onClick={() => setForm((current) => ({ ...current, serverURL: localDevSuggestion }))}
              disabled={submitting}
            >
              改用本机 3001
            </button>
          ) : null}
          <div className="inline-actions wrap">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <LogIn size={14} />
              {submitting ? "正在连接..." : "登录"}
            </button>
            <button className="btn" type="button" onClick={() => workspace.setLoginModalOpen(false)} disabled={submitting}>
              取消
            </button>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}

function ConfirmModal({ ui }: { ui: DesktopUIState }) {
  const modal = ui.confirmModal;
  if (!modal) return null;
  return (
    <ModalFrame title={modal.title} eyebrow="二次确认" onClose={ui.closeModal} narrow>
      <p>{modal.body}</p>
      {modal.detailLines?.length ? (
        <div className="stack-list compact">
          {modal.detailLines.map((line) => <small key={line}>{line}</small>)}
        </div>
      ) : null}
      <div className="inline-actions wrap">
        <button className={modal.tone === "danger" ? "btn btn-danger" : "btn btn-primary"} type="button" onClick={() => void modal.onConfirm?.()}>
          {modal.confirmLabel}
        </button>
        <button className="btn" type="button" onClick={ui.closeModal}>
          取消
        </button>
      </div>
    </ModalFrame>
  );
}

function ProgressModal({ workspace, ui }: { workspace: P1WorkspaceState; ui: DesktopUIState }) {
  const progress = workspace.progress;
  if (!progress || !ui.preferences.showInstallResults) return null;
  const steps = progress.operation === "install" || progress.operation === "update"
    ? ["获取下载凭证", "下载包", "校验大小和文件数", "校验 SHA-256", "写入 Central Store", "完成"]
    : ["准备目标", "执行本地命令", "写入结果", "完成"];
  const currentIndex = Math.max(0, steps.findIndex((step) => progress.stage.includes(step)));
  const toneIcon = progress.result === "success" ? <CheckCircle2 size={18} /> : progress.result === "failed" ? <AlertTriangle size={18} /> : <Sparkles size={18} />;

  return (
    <ModalFrame title={`${progress.operation} · ${progress.skillID}`} eyebrow="本地写入流程" onClose={ui.closeModal} narrow>
      <div className={`callout ${progress.result === "failed" ? "warning" : "info"}`}>
        {toneIcon}
        {progress.message}
      </div>
      <div className="progress-list">
        {steps.map((step, index) => (
          <div className={index < currentIndex ? "progress-step done" : index === currentIndex ? "progress-step active" : "progress-step"} key={step}>
            <span className="step-index">{index + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      {progress.result !== "running" ? (
        <button className="btn btn-primary" type="button" onClick={workspace.clearProgress}>
          知道了
        </button>
      ) : null}
    </ModalFrame>
  );
}

function TargetsModal({ workspace, ui }: { workspace: P1WorkspaceState; ui: DesktopUIState }) {
  const modal = ui.modal;
  if (modal.type !== "targets") return null;
  const skill = workspace.skills.find((item) => item.skillID === modal.skillID) ?? workspace.installedSkills.find((item) => item.skillID === modal.skillID);
  if (!skill) return null;

  return (
    <ModalFrame title={`${skill.displayName} v${skill.localVersion ?? skill.version}`} eyebrow="目标选择" onClose={ui.closeModal}>
      {skill.isScopeRestricted ? <div className="callout warning"><AlertTriangle size={16} /> 权限已收缩：可继续使用当前版本，但不可新增启用位置。</div> : null}
      <div className="target-grid">
        {ui.targetDrafts.map((draft) => (
          <label key={draft.key} className={draft.disabled ? "target-tile disabled" : "target-tile"}>
            <input type="checkbox" checked={draft.selected} disabled={draft.disabled} onChange={() => ui.toggleTargetDraft(draft.key)} />
            <span>
              <strong>{draft.targetName}</strong>
              <small>{draft.targetPath}</small>
              <small>{draft.statusLabel} · {draft.availability.label}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="inline-actions wrap">
        <button className="btn btn-primary" type="button" onClick={() => void ui.applyTargetDrafts(skill)} disabled={skill.isScopeRestricted}>
          应用目标
        </button>
        <button className="btn" type="button" onClick={() => ui.openToolEditor()}>
          <Plus size={14} />
          添加工具
        </button>
        <button className="btn" type="button" onClick={() => ui.openProjectEditor()}>
          <FolderPlus size={14} />
          添加项目
        </button>
      </div>
    </ModalFrame>
  );
}

function ToolEditorModal({ ui }: { ui: DesktopUIState }) {
  if (ui.modal.type !== "tool_editor") return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ui.submitToolDraft();
  }

  const editing =
    ui.toolDraft.toolID !== "custom_directory" ||
    ui.toolDraft.configPath.trim().length > 0 ||
    ui.toolDraft.skillsPath.trim().length > 0;
  const customDirectory = ui.toolDraft.toolID === "custom_directory";
  const draftToolID = ui.toolDraft.toolID ?? "custom_directory";
  const configPlaceholder = customDirectory ? "例如 ~/.codex/config.json" : defaultToolConfigPath(draftToolID);
  const skillsPlaceholder = customDirectory ? "例如 ~/.codex/skills" : defaultToolSkillsPath(draftToolID);

  return (
    <ModalFrame title={editing ? `编辑 ${ui.toolDraft.name}` : "添加自定义工具"} eyebrow="工具路径" onClose={ui.closeModal} narrow>
      <form className="form-stack" onSubmit={submit}>
        {customDirectory ? (
          <label className="field">
            <span>工具名称</span>
            <input value={ui.toolDraft.name} onChange={(event) => ui.setToolDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
        ) : null}
        <label className="field">
          <span>配置路径</span>
          <input value={ui.toolDraft.configPath} onChange={(event) => ui.setToolDraft((current) => ({ ...current, configPath: event.target.value }))} placeholder={configPlaceholder} />
        </label>
        <label className="field">
          <span>skills 安装路径</span>
          <input value={ui.toolDraft.skillsPath} onChange={(event) => ui.setToolDraft((current) => ({ ...current, skillsPath: event.target.value }))} placeholder={skillsPlaceholder} />
        </label>
        <label className="toggle-row">
          <span>启用当前工具配置</span>
          <input type="checkbox" checked={ui.toolDraft.enabled} onChange={(event) => ui.setToolDraft((current) => ({ ...current, enabled: event.target.checked }))} />
        </label>
        <div className="inline-actions wrap">
          <button className="btn btn-primary" type="submit">{editing ? "保存工具配置" : "保存自定义目录"}</button>
          <button className="btn" type="button" onClick={ui.closeModal}>取消</button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ProjectEditorModal({ ui }: { ui: DesktopUIState }) {
  if (ui.modal.type !== "project_editor") return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ui.submitProjectDraft();
  }

  const editing = Boolean(ui.projectDraft.projectID);
  const skillsPlaceholder = defaultProjectSkillsPath(ui.projectDraft.projectPath);

  return (
    <ModalFrame title={editing ? `编辑 ${ui.projectDraft.name}` : "添加项目"} eyebrow="项目配置" onClose={ui.closeModal} narrow>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>项目名称</span>
          <input value={ui.projectDraft.name} onChange={(event) => ui.setProjectDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="field">
          <span>项目路径</span>
          <input value={ui.projectDraft.projectPath} onChange={(event) => ui.setProjectDraft((current) => ({ ...current, projectPath: event.target.value }))} />
        </label>
        <button className="btn btn-small" type="button" onClick={() => void ui.pickProjectDirectoryForDraft()}>
          <FolderPlus size={14} />
          选择文件夹
        </button>
        <label className="field">
          <span>skills 安装路径</span>
          <input value={ui.projectDraft.skillsPath} onChange={(event) => ui.setProjectDraft((current) => ({ ...current, skillsPath: event.target.value }))} placeholder={skillsPlaceholder} />
        </label>
        <label className="toggle-row">
          <span>启用项目级配置</span>
          <input type="checkbox" checked={ui.projectDraft.enabled} onChange={(event) => ui.setProjectDraft((current) => ({ ...current, enabled: event.target.checked }))} />
        </label>
        <div className="inline-actions wrap">
          <button className="btn btn-primary" type="submit">{editing ? "保存项目" : "添加项目"}</button>
          <button className="btn" type="button" onClick={ui.closeModal}>取消</button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ConnectionStatusModal({ workspace, ui }: { workspace: P1WorkspaceState; ui: DesktopUIState }) {
  if (ui.modal.type !== "connection_status") return null;
  const status = workspace.bootstrap.connection.status;
  const title = workspace.loggedIn ? "连接状态" : "本地模式";
  const statusText =
    workspace.loggedIn
      ? status === "connected"
        ? "已连接到企业服务"
        : status === "connecting"
          ? "正在尝试恢复连接"
          : status === "offline"
            ? "离线模式"
            : "连接失败"
      : "当前仅使用本地已安装数据";

  return (
    <ModalFrame title={title} eyebrow="服务连接" onClose={ui.closeModal} narrow>
      <div className={`callout ${status === "connected" ? "info" : "warning"}`}>
        {status === "connected" ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
        {statusText}
      </div>
      <div className="definition-grid">
        <div><dt>最近错误</dt><dd>{workspace.bootstrap.connection.lastError ?? "暂无最近错误"}</dd></div>
        <div><dt>API 版本</dt><dd>{workspace.bootstrap.connection.apiVersion || "-"}</dd></div>
        <div><dt>服务端时间</dt><dd>{workspace.bootstrap.connection.serverTime ? formatDate(workspace.bootstrap.connection.serverTime, ui.language) : "-"}</dd></div>
        <div><dt>当前身份</dt><dd>{workspace.currentUser.displayName}</dd></div>
      </div>
      <div className="inline-actions wrap">
        {workspace.loggedIn ? (
          <button className="btn btn-primary" type="button" onClick={() => void workspace.refreshBootstrap()}>
            <RefreshCw size={14} />
            重试连接
          </button>
        ) : (
          <button className="btn btn-primary" type="button" onClick={() => { ui.closeModal(); workspace.requireAuth(null); }}>
            登录同步
          </button>
        )}
        <button className="btn" type="button" onClick={ui.closeModal}>关闭</button>
      </div>
    </ModalFrame>
  );
}

function AppUpdateModal({ ui }: { ui: DesktopUIState }) {
  if (ui.modal.type !== "app_update") return null;

  return (
    <ModalFrame title="软件更新" eyebrow="桌面客户端" onClose={ui.closeModal} narrow>
      <div className="callout info">
        <Download size={16} />
        <span>
          <strong>发现新版本 {ui.appUpdate.latestVersion}</strong>
          <small>{ui.appUpdate.summary}</small>
        </span>
      </div>
      <div className="definition-grid">
        <div><dt>当前版本</dt><dd>{ui.appUpdate.currentVersion}</dd></div>
        <div><dt>最新版本</dt><dd>{ui.appUpdate.latestVersion}</dd></div>
      </div>
      <div className="stack-list compact">
        {ui.appUpdate.highlights.map((highlight) => (
          <small key={highlight}>{highlight}</small>
        ))}
      </div>
      <div className="inline-actions wrap">
        <button className="btn btn-primary" type="button" onClick={() => void ui.viewAppUpdate()}>
          {ui.appUpdate.actionLabel}
        </button>
        <button className="btn" type="button" onClick={ui.closeModal}>稍后再说</button>
      </div>
    </ModalFrame>
  );
}

function SettingsModal({ workspace, ui }: { workspace: P1WorkspaceState; ui: DesktopUIState }) {
  if (ui.modal.type !== "settings") return null;

  const themeOptions = [
    { value: "classic", title: "Classic", description: "冷白背景，保持企业工作台的标准对比。" },
    { value: "fresh", title: "Fresh", description: "更轻一点的蓝感背景，适合长时间浏览。" },
    { value: "contrast", title: "Contrast", description: "提高层级对比，适合信息密度更高的场景。" }
  ] as const;

  return (
    <ModalFrame title={localize(ui.language, "设置", "Settings")} eyebrow={localize(ui.language, "基础偏好", "Preferences")} onClose={ui.closeModal}>
      <div className="overlay-intro settings-intro">
        <div>
          <p className="overlay-intro-title">{localize(ui.language, "保留主题、语言和同步入口，通过头像菜单进入。", "Keep theme, language, and sync controls here via the avatar menu.")}</p>
          <p className="overlay-intro-copy">{localize(ui.language, "不再占用一级导航，只保留高频偏好与本地环境信息。", "This no longer occupies top-level navigation and stays focused on frequent preferences and local environment info.")}</p>
        </div>
      </div>
      <div className="settings-stack">
        <section className="settings-section">
          <h3>{localize(ui.language, "常规", "General")}</h3>
          <SelectField
            label={localize(ui.language, "显示语言", "Display Language")}
            value={ui.preferences.language}
            onChange={(value) =>
              ui.setPreferences((current) => ({
                ...current,
                language: value as typeof current.language,
                autoDetectLanguage: value === "auto"
              }))
            }
            options={[
              { value: "auto", label: settingsLanguageLabel("auto", ui.language) },
              { value: "zh-CN", label: settingsLanguageLabel("zh-CN", ui.language) },
              { value: "en-US", label: settingsLanguageLabel("en-US", ui.language) }
            ]}
          />
          <label className="toggle-row compact">
            <span>{localize(ui.language, "按系统地区自动识别", "Follow System Language")}</span>
            <input
              type="checkbox"
              checked={ui.preferences.autoDetectLanguage}
              onChange={(event) =>
                ui.setPreferences((current) => ({
                  ...current,
                  autoDetectLanguage: event.target.checked,
                  language: event.target.checked ? "auto" : current.language === "auto" ? ui.language : current.language
                }))
              }
            />
          </label>
        </section>

        <section className="settings-section">
          <h3>{localize(ui.language, "主题", "Theme")}</h3>
          <div className="settings-choice-grid">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                className={ui.preferences.theme === option.value ? "settings-choice active" : "settings-choice"}
                type="button"
                onClick={() => ui.setPreferences((current) => ({ ...current, theme: option.value }))}
              >
                <strong>{themeLabel(option.value, ui.language)}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>Central Store</h3>
          <p className="settings-path">{workspace.localCentralStorePath || previewCentralStorePath()}</p>
          <small>这里只展示当前路径，真实文件写入仍通过桌面命令处理。</small>
        </section>

        <section className="settings-section">
          <h3>{localize(ui.language, "同步", "Sync")}</h3>
          <label className="toggle-row compact">
            <span>{localize(ui.language, "显示安装/更新结果", "Show Install and Update Results")}</span>
            <input type="checkbox" checked={ui.preferences.showInstallResults} onChange={(event) => ui.setPreferences((current) => ({ ...current, showInstallResults: event.target.checked }))} />
          </label>
          <label className="toggle-row compact">
            <span>{localize(ui.language, "同步本地事件到通知", "Sync Local Events into Notifications")}</span>
            <input type="checkbox" checked={ui.preferences.syncLocalEvents} onChange={(event) => ui.setPreferences((current) => ({ ...current, syncLocalEvents: event.target.checked }))} />
          </label>
          <div className="inline-actions wrap">
            <button className="btn" type="button" onClick={() => void workspace.refreshBootstrap()}>
              <RefreshCw size={14} />
              {localize(ui.language, "刷新连接状态", "Refresh Connection")}
            </button>
          </div>
        </section>
      </div>
    </ModalFrame>
  );
}

function SkillDetailOverlay({ workspace, ui, overlay }: { workspace: P1WorkspaceState; ui: DesktopUIState; overlay: OverlayState }) {
  if (overlay.kind !== "skill_detail") return null;
  const skill = workspace.skills.find((item) => item.skillID === overlay.skillID) ?? workspace.installedSkills.find((item) => item.skillID === overlay.skillID) ?? workspace.selectedSkill;
  if (!skill) return null;

  return (
    <ModalFrame title={skill.displayName} eyebrow="Skill 详情" onClose={ui.closeOverlay} full>
      <div className="skill-detail-layout">
        <section className="stage-panel">
          <div className="detail-hero">
            <InitialBadge label={skill.displayName} large />
            <div>
              <div className="pill-row">
                <TagPill tone={statusTone(skill)}>{statusLabel(skill, ui.language)}</TagPill>
                <TagPill tone={skill.riskLevel === "high" ? "danger" : skill.riskLevel === "medium" ? "warning" : "info"}>{riskLabel(skill, ui.language)}</TagPill>
              </div>
              <h3>{skill.displayName}</h3>
              <p>{skill.description}</p>
              <small>{skill.skillID} · {skill.authorName} · {skill.authorDepartment}</small>
            </div>
          </div>
          <div className="definition-grid split">
            <div><dt>版本</dt><dd>v{skill.version}</dd></div>
            <div><dt>Star</dt><dd>{skill.starCount}</dd></div>
            <div><dt>下载量</dt><dd>{skill.downloadCount}</dd></div>
            <div><dt>最近更新</dt><dd>{formatDate(skill.currentVersionUpdatedAt, ui.language)}</dd></div>
          </div>
          <div className="detail-block">
            <h3>兼容与状态</h3>
            <div className="pill-row">
              {skill.compatibleTools.map((tool) => <TagPill key={tool} tone="info">{tool}</TagPill>)}
              {skill.compatibleSystems.map((system) => <TagPill key={system} tone="neutral">{system}</TagPill>)}
            </div>
          </div>
          <div className="detail-block">
            <h3>已启用位置</h3>
            {skill.enabledTargets.length === 0 ? <p>当前还没有启用位置。</p> : null}
            <div className="stack-list compact">
              {skill.enabledTargets.map((target) => (
                <div className="micro-row" key={`${target.targetType}:${target.targetID}`}>
                  <strong>{target.targetName}</strong>
                  <small>{target.targetPath}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="stage-panel detail-side-panel">
          <div className="detail-block">
            <h3>主操作</h3>
            <div className="inline-actions wrap">
              {skill.installState === "not_installed" ? (
                <button className="btn btn-primary" type="button" onClick={() => ui.openInstallConfirm(skill, "install")}>安装</button>
              ) : null}
              {skill.installState === "update_available" ? (
                <button className="btn btn-primary" type="button" onClick={() => ui.openInstallConfirm(skill, "update")}>更新</button>
              ) : null}
              {skill.localVersion ? (
                <button className="btn" type="button" onClick={() => ui.openTargetsModal(skill)}>启用范围</button>
              ) : null}
              <button className="btn" type="button" onClick={() => void workspace.toggleStar(skill.skillID)}>
                {skill.starred ? "取消收藏" : "收藏"}
              </button>
            </div>
          </div>
          <div className="detail-block">
            <h3>最近变化</h3>
            <p>{skill.reviewSummary ?? skill.readme ?? "当前版本已准备就绪，可直接查看范围、状态与安装动作。"}</p>
          </div>
        </aside>
      </div>
    </ModalFrame>
  );
}

function splitCSV(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function bumpPatchVersion(version: string): string {
  const [major, minor, patch] = version.split(".").map((item) => Number.parseInt(item, 10));
  if (![major, minor, patch].every(Number.isFinite)) {
    return "1.0.0";
  }
  return `${major}.${minor}.${patch + 1}`;
}

function DraftWorkspace({
  workspace,
  ui,
  selectedPublisherSkill,
  composerTitle,
  draft,
  setDraft,
  uploadEntries,
  setUploadEntries,
  tagInput,
  setTagInput,
  toolInput,
  setToolInput,
  systemInput,
  setSystemInput,
  wizardStep,
  setWizardStep,
  onResetDraft,
  onSubmitDraft
}: {
  workspace: P1WorkspaceState;
  ui: DesktopUIState;
  selectedPublisherSkill: PublisherSkillSummary | null;
  composerTitle: string;
  draft: PublishDraft;
  setDraft: Dispatch<SetStateAction<PublishDraft>>;
  uploadEntries: Array<{ file: File; relativePath: string }>;
  setUploadEntries: Dispatch<SetStateAction<Array<{ file: File; relativePath: string }>>>;
  tagInput: string;
  setTagInput: Dispatch<SetStateAction<string>>;
  toolInput: string;
  setToolInput: Dispatch<SetStateAction<string>>;
  systemInput: string;
  setSystemInput: Dispatch<SetStateAction<string>>;
  wizardStep: 1 | 2 | 3;
  setWizardStep: Dispatch<SetStateAction<1 | 2 | 3>>;
  onResetDraft: (submissionType?: PublishDraft["submissionType"], source?: PublisherSkillSummary) => void;
  onSubmitDraft: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const folderInputProps = { webkitdirectory: "" } as { [key: string]: string };
  const publishPrecheck = buildPublishPrecheck(draft);
  const canSubmitPermissionChange =
    draft.skillID.trim().length > 0 &&
    draft.displayName.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    (draft.scope !== "selected_departments" || draft.selectedDepartmentIDs.length > 0);
  const canSubmitDraft = draft.submissionType === "permission_change" ? canSubmitPermissionChange : publishPrecheck.canSubmit;

  function handleZipUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadEntries([{ file, relativePath: file.name }]);
    setDraft((current) => ({
      ...current,
      uploadMode: "zip",
      packageName: file.name,
      files: [
        {
          name: file.name,
          relativePath: file.name,
          size: file.size,
          mimeType: file.type || "application/zip"
        }
      ]
    }));
  }

  function handleFolderUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const entries = files.map((file) => {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      return { file, relativePath };
    });
    setUploadEntries(entries);
    setDraft((current) => ({
      ...current,
      uploadMode: "folder",
      packageName: entries[0]?.relativePath.split("/")[0] ?? "skill-folder",
      files: entries.map((entry) => ({
        name: entry.relativePath,
        relativePath: entry.relativePath,
        size: entry.file.size,
        mimeType: entry.file.type || "application/octet-stream"
      }))
    }));
  }

  return (
    <section className="overlay-stack">
      <div className="publisher-step-row">
        {[1, 2, 3].map((step) => (
          <button key={step} className={wizardStep === step ? "btn btn-primary btn-small" : "btn btn-small"} type="button" onClick={() => setWizardStep(step as 1 | 2 | 3)}>
            {step === 1 ? "1. 基础信息" : step === 2 ? "2. 包上传与校验" : "3. 最终确认"}
          </button>
        ))}
      </div>
      <form className="form-stack" onSubmit={onSubmitDraft}>
        <OverlaySectionHeader title={composerTitle} eyebrow="发布工作台" description="发布、更新、权限变更都统一在这里起草和提交流程。" />
        {wizardStep === 1 ? (
          <>
            <SelectField label="提交类型" value={draft.submissionType} options={["publish", "update", "permission_change"]} onChange={(value) => onResetDraft(value as PublishDraft["submissionType"], selectedPublisherSkill ?? undefined)} />
            <label className="field"><span>skillID</span><input value={draft.skillID} onChange={(event) => setDraft((current) => ({ ...current, skillID: event.target.value }))} disabled={draft.submissionType !== "publish"} /></label>
            <label className="field"><span>显示名称</span><input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} /></label>
            <label className="field"><span>描述</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
            <label className="field"><span>版本号</span><input value={draft.version} onChange={(event) => setDraft((current) => ({ ...current, version: event.target.value }))} disabled={draft.submissionType === "permission_change"} /></label>
            <label className="field"><span>变更说明</span><textarea rows={3} value={draft.changelog} onChange={(event) => setDraft((current) => ({ ...current, changelog: event.target.value }))} disabled={draft.submissionType === "permission_change"} /></label>
            <SelectField label="授权范围" value={draft.scope} options={["current_department", "department_tree", "selected_departments", "all_employees"]} onChange={(value) => setDraft((current) => ({ ...current, scope: value as PublishDraft["scope"] }))} />
            {draft.scope === "selected_departments" ? (
              <label className="field">
                <span>指定部门（多选）</span>
                <select
                  multiple
                  value={draft.selectedDepartmentIDs}
                  onChange={(event) => {
                    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setDraft((current) => ({ ...current, selectedDepartmentIDs: values }));
                  }}
                >
                  {flattenDepartments(workspace.adminData.departments).map((department) => (
                    <option key={department.departmentID} value={department.departmentID}>{department.path}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <SelectField label="公开级别" value={draft.visibility} options={["private", "summary_visible", "detail_visible", "public_installable"]} onChange={(value) => setDraft((current) => ({ ...current, visibility: value as PublishDraft["visibility"] }))} />
            <label className="field"><span>分类</span><input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} /></label>
            <label className="field"><span>标签（逗号分隔）</span><input value={tagInput} onChange={(event) => { const value = event.target.value; setTagInput(value); setDraft((current) => ({ ...current, tags: splitCSV(value) })); }} /></label>
            <label className="field"><span>适用工具（逗号分隔）</span><input value={toolInput} onChange={(event) => { const value = event.target.value; setToolInput(value); setDraft((current) => ({ ...current, compatibleTools: splitCSV(value) })); }} /></label>
            <label className="field"><span>适用系统（逗号分隔）</span><input value={systemInput} onChange={(event) => { const value = event.target.value; setSystemInput(value); setDraft((current) => ({ ...current, compatibleSystems: splitCSV(value) })); }} /></label>
            <div className="inline-actions wrap">
              <button className="btn btn-primary" type="button" onClick={() => setWizardStep(2)} disabled={draft.skillID.trim().length === 0}>下一步：组装校验</button>
              <button className="btn" type="button" onClick={() => onResetDraft(draft.submissionType, selectedPublisherSkill ?? undefined)}>重置</button>
            </div>
          </>
        ) : null}

        {wizardStep === 2 ? (
          <>
            {draft.submissionType !== "permission_change" ? (
              <>
                <div className="inline-actions wrap">
                  <label className="btn">
                    上传 ZIP
                    <input type="file" accept=".zip,application/zip" onChange={handleZipUpload} style={{ display: "none" }} />
                  </label>
                  <label className="btn">
                    上传文件夹
                    <input type="file" multiple {...folderInputProps} onChange={handleFolderUpload} style={{ display: "none" }} />
                  </label>
                </div>
                <div className="detail-block">
                  <h3>包含的文件清单 ({draft.files.length})</h3>
                  {draft.files.length === 0 ? <p>选择 ZIP 或文件夹后预校验内容。</p> : null}
                  <div className="stack-list compact limited-height">
                    {draft.files.slice(0, 15).map((file) => (
                      <div className="micro-row" key={file.relativePath}>
                        <strong>{file.relativePath}</strong>
                        <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="detail-block">
                  <h3>预检查结果</h3>
                  <div className="stack-list compact">
                    {publishPrecheck.items.map((item) => (
                      <div className="micro-row" key={item.id}>
                        <strong>{item.label}</strong>
                        <small>{item.status === "pass" ? "通过" : item.status === "warn" ? "需关注" : "待判定"} · {item.message}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="callout warning">
                <AlertTriangle size={16} />
                <span>
                  <strong>权限变更不需要重新上传包</strong>
                  <small>审核通过前会继续沿用最新历史版本，仅变更可见范围与权限配置。</small>
                </span>
              </div>
            )}
            <div className="inline-actions wrap">
              <button className="btn" type="button" onClick={() => setWizardStep(1)}>上一步</button>
              <button className="btn btn-primary" type="button" onClick={() => setWizardStep(3)} disabled={draft.submissionType !== "permission_change" && !publishPrecheck.canSubmit}>下一步：最终确认</button>
            </div>
          </>
        ) : null}

        {wizardStep === 3 ? (
          <>
            <div className="detail-block">
              <h3>最终确认</h3>
              <div className="definition-grid split">
                <div><dt>类型</dt><dd>{submissionTypeLabel(draft.submissionType, ui.language)}</dd></div>
                <div><dt>范围</dt><dd>{scopeLabel(draft.scope, ui.language)}</dd></div>
                <div><dt>公开级别</dt><dd>{publishVisibilityLabel(draft.visibility, ui.language)}</dd></div>
                <div><dt>版本</dt><dd>{draft.version}</dd></div>
              </div>
            </div>
            {!canSubmitDraft ? (
              <div className="callout warning">
                <AlertTriangle size={16} />
                <span>
                  <strong>校验尚未全部通过</strong>
                  <small>请返回前一步补齐必填信息或包文件。</small>
                </span>
              </div>
            ) : null}
            <div className="inline-actions wrap">
              <button className="btn" type="button" onClick={() => setWizardStep(2)}>上一步</button>
              <button className="btn btn-primary" type="submit" disabled={!canSubmitDraft}>提交到发布中心</button>
            </div>
          </>
        ) : null}
      </form>
    </section>
  );
}

function PublisherOverlay({ workspace, ui, overlay }: { workspace: P1WorkspaceState; ui: DesktopUIState; overlay: OverlayState }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<PublishDraft>({
    submissionType: "publish",
    uploadMode: "none",
    packageName: "",
    skillID: "",
    displayName: "",
    description: "",
    version: "1.0.0",
    scope: "current_department",
    selectedDepartmentIDs: [],
    visibility: "private",
    changelog: "",
    category: "uncategorized",
    tags: [],
    compatibleTools: [],
    compatibleSystems: ["windows"],
    files: []
  });
  const [uploadEntries, setUploadEntries] = useState<Array<{ file: File; relativePath: string }>>([]);
  const [tagInput, setTagInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [systemInput, setSystemInput] = useState("windows");

  useEffect(() => {
    if (overlay.kind === "publisher") {
      setComposerOpen(overlay.pane === "compose");
    }
  }, [overlay]);

  if (overlay.kind !== "publisher") return null;

  const selectedPublisherSkill =
    workspace.publisherData.publisherSkills.find((skill) => skill.latestSubmissionID === workspace.publisherData.selectedPublisherSubmissionID) ??
    workspace.publisherData.publisherSkills[0] ??
    null;
  const selectedSubmission = workspace.publisherData.selectedPublisherSubmission;

  function applyDraftLists(nextDraft: PublishDraft) {
    setDraft(nextDraft);
    setTagInput(nextDraft.tags.join(", "));
    setToolInput(nextDraft.compatibleTools.join(", "));
    setSystemInput(nextDraft.compatibleSystems.join(", "));
  }

  function resetDraft(submissionType: PublishDraft["submissionType"] = "publish", source?: PublisherSkillSummary) {
    const sourceSubmission =
      source?.latestSubmissionID && workspace.publisherData.selectedPublisherSubmission?.submissionID === source.latestSubmissionID
        ? workspace.publisherData.selectedPublisherSubmission
        : null;
    applyDraftLists({
      submissionType,
      uploadMode: "none",
      packageName: "",
      skillID: source?.skillID ?? "",
      displayName: source?.displayName ?? "",
      description: sourceSubmission?.description ?? "",
      version:
        submissionType === "update"
          ? bumpPatchVersion(source?.currentVersion ?? sourceSubmission?.currentVersion ?? "1.0.0")
          : source?.currentVersion ?? sourceSubmission?.currentVersion ?? "1.0.0",
      scope: source?.currentScopeType ?? "current_department",
      selectedDepartmentIDs: sourceSubmission?.selectedDepartmentIDs ?? [],
      visibility: source?.currentVisibilityLevel ?? "private",
      changelog: "",
      category: "uncategorized",
      tags: [],
      compatibleTools: [],
      compatibleSystems: ["windows"],
      files: []
    });
    setUploadEntries([]);
    setWizardStep(1);
    setComposerOpen(true);
    ui.setPublisherPane("compose");
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("submissionType", draft.submissionType);
    formData.set("skillID", draft.skillID);
    formData.set("displayName", draft.displayName);
    formData.set("description", draft.description);
    formData.set("version", draft.version);
    formData.set("scopeType", draft.scope);
    formData.set("selectedDepartmentIDs", JSON.stringify(draft.selectedDepartmentIDs));
    formData.set("visibilityLevel", draft.visibility);
    formData.set("changelog", draft.changelog);
    formData.set("category", draft.category);
    formData.set("tags", JSON.stringify(splitCSV(tagInput)));
    formData.set("compatibleTools", JSON.stringify(splitCSV(toolInput)));
    formData.set("compatibleSystems", JSON.stringify(splitCSV(systemInput)));
    for (const entry of uploadEntries) {
      formData.append("files", entry.file, entry.relativePath);
    }
    void workspace.publisherData.submitPublisherSubmission(formData);
    setComposerOpen(false);
    ui.setPublisherPane("mine");
  }

  const composerTitle =
    draft.submissionType === "publish"
      ? "新建发布"
      : draft.submissionType === "update"
        ? "发布新版本"
        : "提交权限变更";

  const loadSubmissionFileContent = async (relativePath: string) => {
    if (!selectedSubmission) {
      throw new Error("未选择提交记录");
    }
    return workspace.publisherData.getSubmissionFileContent(selectedSubmission.submissionID, relativePath);
  };

  return (
    <ModalFrame title="发布中心" eyebrow="Publisher" onClose={ui.closeOverlay} full>
      {!workspace.loggedIn ? (
        <div className="overlay-stack">
          <p>发布、更新、权限变更和提交流程都统一收敛在这里。</p>
          <button className="btn btn-primary" type="button" onClick={() => workspace.requireAuth("publisher")}>
            登录后继续
          </button>
        </div>
      ) : (
        <div className="publisher-overlay">
          <aside className="publisher-side">
            <button className={composerOpen ? "sidebar-switch active" : "sidebar-switch"} type="button" onClick={() => { setComposerOpen(true); ui.setPublisherPane("compose"); }}>
              <span>发布</span>
              <small>起草工作区</small>
            </button>
            <button className={!composerOpen ? "sidebar-switch active" : "sidebar-switch"} type="button" onClick={() => { setComposerOpen(false); ui.setPublisherPane("mine"); }}>
              <span>我的</span>
              <small>{workspace.publisherData.publisherSkills.length}</small>
            </button>
          </aside>
          <div className="publisher-main">
            {composerOpen ? (
              <DraftWorkspace
                workspace={workspace}
                ui={ui}
                selectedPublisherSkill={selectedPublisherSkill}
                composerTitle={composerTitle}
                draft={draft}
                setDraft={setDraft}
                uploadEntries={uploadEntries}
                setUploadEntries={setUploadEntries}
                tagInput={tagInput}
                setTagInput={setTagInput}
                toolInput={toolInput}
                setToolInput={setToolInput}
                systemInput={systemInput}
                setSystemInput={setSystemInput}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                onResetDraft={resetDraft}
                onSubmitDraft={submitDraft}
              />
            ) : (
              <div className="publisher-detail-layout">
                <section className="stage-panel list-panel">
                  <div className="inline-actions wrap">
                    <button className="btn btn-primary" type="button" onClick={() => resetDraft("publish")}>
                      <Upload size={14} />
                      新建发布
                    </button>
                  </div>
                  {workspace.publisherData.publisherSkills.length === 0 ? <SectionEmpty title="还没有发布记录" body="点击新建发布，或上传 ZIP / 文件夹开始第一次提交流程。" /> : null}
                  <div className="stack-list">
                    {workspace.publisherData.publisherSkills.map((skill) => (
                      <article className="publisher-item" key={skill.skillID}>
                        <div className="publisher-item-head">
                          <div>
                            <strong>{skill.displayName}</strong>
                            <small>{skill.skillID} · 当前版本 {skill.currentVersion ?? "未发布"}</small>
                          </div>
                          <div className="pill-row">
                            {skill.currentStatus ? <TagPill tone="info">{skill.currentStatus}</TagPill> : null}
                            {skill.latestWorkflowState ? (
                              <TagPill tone={skill.latestWorkflowState === "published" ? "success" : skill.latestWorkflowState === "manual_precheck" ? "warning" : "info"}>
                                {workflowStateLabel(skill.latestWorkflowState, ui.language)}
                              </TagPill>
                            ) : null}
                          </div>
                        </div>
                        <small>最近提交：{skill.submittedAt ? formatDate(skill.submittedAt, ui.language) : "暂无提交"} · 更新于 {formatDate(skill.updatedAt, ui.language)}</small>
                        {skill.latestReviewSummary ? <p>{skill.latestReviewSummary}</p> : null}
                        <div className="inline-actions wrap">
                          {skill.latestSubmissionID ? (
                            <button className="btn btn-small" type="button" onClick={() => workspace.publisherData.setSelectedPublisherSubmissionID(skill.latestSubmissionID ?? null)}>
                              查看详情
                            </button>
                          ) : null}
                          <button className="btn btn-small" type="button" onClick={() => resetDraft("update", skill)}>发布新版本</button>
                          <button className="btn btn-small" type="button" onClick={() => resetDraft("permission_change", skill)}>修改权限</button>
                          {skill.canWithdraw && skill.latestSubmissionID ? (
                            <button className="btn btn-small" type="button" onClick={() => void workspace.publisherData.withdrawPublisherSubmission(skill.latestSubmissionID ?? "")}>撤回</button>
                          ) : null}
                          {skill.availableStatusActions.includes("delist") ? (
                            <button className="btn btn-small" type="button" onClick={() => void workspace.publisherData.delistPublisherSkill(skill.skillID)}>下架</button>
                          ) : null}
                          {skill.availableStatusActions.includes("relist") ? (
                            <button className="btn btn-small" type="button" onClick={() => void workspace.publisherData.relistPublisherSkill(skill.skillID)}>上架</button>
                          ) : null}
                          {skill.availableStatusActions.includes("archive") ? (
                            <button className="btn btn-danger btn-small" type="button" onClick={() => void workspace.publisherData.archivePublisherSkill(skill.skillID)}>
                              <Archive size={14} />
                              归档
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="stage-panel detail-panel wide">
                  {!selectedSubmission ? (
                    <SectionEmpty title="选择一条提交查看详情" body="右侧会显示提交详情、包预览、预检查和历史时间线。" />
                  ) : (
                    <>
                      <div className="detail-hero compact">
                        <InitialBadge label={selectedSubmission.displayName} large />
                        <div>
                          <div className="pill-row">
                            <TagPill tone="info">{submissionTypeLabel(selectedSubmission.submissionType, ui.language)}</TagPill>
                            <TagPill tone={selectedSubmission.workflowState === "published" ? "success" : selectedSubmission.workflowState === "manual_precheck" ? "warning" : "info"}>
                              {workflowStateLabel(selectedSubmission.workflowState, ui.language)}
                            </TagPill>
                          </div>
                          <h3>{selectedSubmission.displayName}</h3>
                          <p>{selectedSubmission.description}</p>
                        </div>
                      </div>
                      <div className="definition-grid split">
                        <div><dt>版本</dt><dd>{selectedSubmission.version}</dd></div>
                        <div><dt>公开级别</dt><dd>{publishVisibilityLabel(selectedSubmission.visibilityLevel, ui.language)}</dd></div>
                        <div><dt>授权范围</dt><dd>{scopeLabel(selectedSubmission.scopeType, ui.language)}</dd></div>
                        <div><dt>提交时间</dt><dd>{formatDate(selectedSubmission.submittedAt, ui.language)}</dd></div>
                      </div>
                      {selectedSubmission.packageURL ? (
                        <div className="inline-actions wrap">
                          <button className="btn btn-small" type="button" onClick={() => void downloadAuthenticatedFile(selectedSubmission.packageURL ?? "", `${selectedSubmission.skillID ?? "submission"}.zip`)}>
                            <Download size={14} />
                            下载包
                          </button>
                          {selectedSubmission.canWithdraw ? (
                            <button className="btn btn-small" type="button" onClick={() => void workspace.publisherData.withdrawPublisherSubmission(selectedSubmission.submissionID ?? "")}>
                              撤回提交
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      <PackagePreviewPanel
                        files={selectedSubmission.packageFiles}
                        packageURL={selectedSubmission.packageURL}
                        downloadName={`${selectedSubmission.skillID}.zip`}
                        loadContent={loadSubmissionFileContent}
                        ui={ui}
                      />
                      <div className="detail-block">
                        <h3>预检查结果</h3>
                        {selectedSubmission.precheckResults.length === 0 ? (
                          <p>等待系统初审。</p>
                        ) : (
                          <div className="stack-list compact">
                            {selectedSubmission.precheckResults.map((item) => (
                              <div className="micro-row" key={item.id}>
                                <strong>{item.label}</strong>
                                <small>{item.message}</small>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalFrame>
  );
}

function DiagnosticsOverlay({ workspace, ui, overlay }: { workspace: P1WorkspaceState; ui: DesktopUIState; overlay: OverlayState }) {
  if (overlay.kind !== "diagnostics") return null;

  const abnormalTargets = workspace.scanTargets.filter((summary) => summary.lastError || summary.counts.unmanaged + summary.counts.conflict + summary.counts.orphan > 0);

  return (
    <ModalFrame title="诊断" eyebrow="本地扫描" onClose={ui.closeOverlay} full>
      <div className="overlay-grid two-columns">
        <section className="stage-panel">
          <div className="section-header">
            <div>
              <div className="eyebrow">扫描摘要</div>
              <h2>目标诊断</h2>
              <p>工具和项目的扫描异常会集中显示在这里。</p>
            </div>
            <button className="btn btn-small" type="button" onClick={() => void workspace.scanLocalTargets()}>
              <RefreshCw size={14} />
              重新扫描
            </button>
          </div>
          {abnormalTargets.length === 0 ? <SectionEmpty title="当前没有异常目标" body="工具与项目的扫描异常会集中显示在这里。" /> : null}
          <div className="stack-list">
            {abnormalTargets.map((summary) => (
              <article className="panel-lite" key={summary.id}>
                <div className="inline-heading">
                  <div>
                    <strong>{summary.targetName}</strong>
                    <p>{summary.targetPath}</p>
                  </div>
                  <TagPill tone="warning">{summary.targetType === "tool" ? "工具" : "项目"}</TagPill>
                </div>
                <div className="pill-row">
                  <TagPill tone="info">托管 {summary.counts.managed}</TagPill>
                  <TagPill tone="warning">异常 {summary.counts.unmanaged + summary.counts.conflict + summary.counts.orphan}</TagPill>
                </div>
                {summary.lastError ? <div className="callout warning"><AlertTriangle size={16} /> {summary.lastError}</div> : null}
                <div className="stack-list compact">
                  {summary.findings.filter((finding) => finding.kind !== "managed").slice(0, 4).map((finding) => (
                    <div className="micro-row" key={finding.id}>
                      <strong>{finding.relativePath}</strong>
                      <small>{finding.message}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="stage-panel">
          <OverlaySectionHeader title="未托管 / 冲突资产" eyebrow="发现" description="本地目录里的 unmanaged / orphan / conflict 结果会显示在这里。" />
          {workspace.discoveredLocalSkills.length === 0 ? <SectionEmpty title="没有发现游离副本" body="本地目录里的 unmanaged / orphan / conflict 结果会显示在这里。" /> : null}
          <div className="stack-list">
            {workspace.discoveredLocalSkills.map((skill) => (
              <article className="panel-lite" key={skill.skillID}>
                <div className="inline-heading">
                  <div>
                    <strong>{skill.displayName}</strong>
                    <p>{skill.skillID}</p>
                  </div>
                  <div className="pill-row">
                    <TagPill tone="warning">{skill.sourceLabel}</TagPill>
                    {skill.matchedMarketSkill ? <TagPill tone="info">市场已存在</TagPill> : null}
                  </div>
                </div>
                <div className="stack-list compact">
                  {skill.targets.slice(0, 4).map((target, index) => (
                    <div className="micro-row" key={`${skill.skillID}:${target.targetType}:${target.targetID}:${index}`}>
                      <strong>{target.targetName}</strong>
                      <small>{target.message}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </ModalFrame>
  );
}

export function FlashToast({ flash, onClear }: { flash: FlashMessage | null; onClear: () => void }) {
  useEffect(() => {
    if (!flash) return;
    const handle = window.setTimeout(onClear, 3200);
    return () => window.clearTimeout(handle);
  }, [flash, onClear]);

  if (!flash) return null;

  return (
    <OverlayPortal>
      <div className={`flash-toast ${flash.tone}`} role="status" aria-live="polite">
        <strong>{flash.title}</strong>
        <p>{flash.body}</p>
      </div>
    </OverlayPortal>
  );
}

export function DesktopOverlays({ workspace, ui }: { workspace: P1WorkspaceState; ui: DesktopUIState }) {
  return (
    <OverlayPortal>
      <>
        <LoginModal workspace={workspace} ui={ui} />
        <ConfirmModal ui={ui} />
        <ProgressModal workspace={workspace} ui={ui} />
        <TargetsModal workspace={workspace} ui={ui} />
        <ToolEditorModal ui={ui} />
        <ProjectEditorModal ui={ui} />
        <ConnectionStatusModal workspace={workspace} ui={ui} />
        <AppUpdateModal ui={ui} />
        <SettingsModal workspace={workspace} ui={ui} />
        <DiagnosticsOverlay workspace={workspace} ui={ui} overlay={ui.overlay} />
      </>
    </OverlayPortal>
  );
}
