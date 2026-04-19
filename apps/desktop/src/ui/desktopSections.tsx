import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  AlertTriangle,
  CircleGauge,
  Download,
  FolderPlus,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Users
} from "lucide-react";
import type { MarketFilters, PublishDraft, PublisherSkillSummary, SkillSummary } from "../domain/p1.ts";
import { buildPublishPrecheck } from "../state/ui/publishPrecheck.ts";
import type { DesktopUIState, ManagePane, TopLevelSection } from "../state/useDesktopUIState.ts";
import type { P1WorkspaceState } from "../state/useP1Workspace.ts";
import { downloadAuthenticatedFile } from "../services/p1Client.ts";
import {
  deriveDepartmentWorkbench,
  filterAdminUsers,
  getAdminSkillCategory,
  getAdminSkillDescription,
  getAdminSkillReviewSummary,
  getAdminSkillRiskLevel,
  getAdminUserDepartmentPath,
  getAdminUserLastLoginAt,
  getDepartmentAdminCount,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter
} from "../state/ui/adminManageSelectors.ts";
import {
  adapterStatusLabel,
  detectionMethodLabel,
  flattenDepartments,
  formatDate,
  localize,
  publishVisibilityLabel,
  reviewActionLabel,
  riskLabel,
  roleLabel,
  skillInitials,
  scopeLabel,
  statusLabel,
  statusTone,
  submissionTypeLabel,
  transformStrategyLabel,
  workflowStateLabel
} from "./desktopShared.tsx";
import { AuthGateCard, InitialBadge, PackagePreviewPanel, SectionEmpty, SectionProps, SelectField, TagPill } from "./pageCommon.tsx";

function formatMetricCount(value: number, language: "zh-CN" | "en-US") {
  return new Intl.NumberFormat(language, {
    notation: value >= 1000 ? "compact" : "standard",
    compactDisplay: "short",
    maximumFractionDigits: value >= 1000 ? 1 : 0
  }).format(value);
}

function manageSkillStatusLabel(status: string) {
  return {
    published: "已上架",
    delisted: "已下架",
    archived: "已归档"
  }[status] ?? status;
}

function manageRiskLabel(risk: string) {
  return {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
    unknown: "未知风险"
  }[risk] ?? risk;
}

function manageRiskTone(risk: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warning";
  if (risk === "low") return "success";
  return "neutral";
}

function userStatusLabel(status: string) {
  return {
    active: "正常",
    frozen: "已冻结",
    deleted: "已删除"
  }[status] ?? status;
}

function primaryMarketAction(skill: SkillSummary) {
  if (skill.installState === "blocked" || !skill.canInstall) {
    return { label: "不可安装", disabled: true as const };
  }
  if (skill.installState === "update_available" && skill.canUpdate) {
    return { label: "更新", action: "update" as const };
  }
  if (skill.enabledTargets.length > 0) {
    return { label: "管理范围", action: "enabled" as const };
  }
  if (skill.localVersion) {
    return { label: "启用范围", action: "installed" as const };
  }
  return { label: "安装", action: "install" as const };
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

function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="section-header-action">{action}</div> : null}
    </div>
  );
}

function WorkspaceToolbar({
  icon,
  title,
  description,
  actions
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="workspace-toolbar">
      <div className="workspace-toolbar-copy">
        <div className="toolbar-label">
          {icon}
          <span>{title}</span>
        </div>
        <p className="workspace-toolbar-desc">{description}</p>
      </div>
      {actions ? <div className="inline-actions wrap workspace-toolbar-actions">{actions}</div> : null}
    </div>
  );
}

function HomeHero({ workspace, ui }: SectionProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ui.openCommunityPane("skills");
  }

  return (
    <section className="home-hero-shell">
      <section className="hero-surface hero-feature-home">
        <div className="hero-copy hero-copy-home">
          <h1>Agent 探索</h1>
          <form className="prompt-composer" onSubmit={submit}>
            <textarea
              name="query"
              className="prompt-composer-input"
              value={workspace.filters.query}
              placeholder="向 Agent 提问，@ 添加文件，/ 输入命令，$ 使用技能"
              onChange={(event) => workspace.setFilters((current) => ({ ...current, query: event.target.value }))}
            />
            <div className="prompt-composer-toolbar">
              <div className="prompt-toolbar-left">
                <button className="composer-icon-button" type="button" aria-label="添加">+</button>
                <button className="composer-pill" type="button">
                  {workspace.loggedIn && workspace.bootstrap.connection.status === "connected" ? "在线权限" : "完全访问权限"}
                </button>
              </div>
              <div className="prompt-toolbar-right">
                <button className="composer-text-button" type="button">GPT-5.4</button>
                <button className="composer-text-button" type="button">超高</button>
                <button className="composer-icon-button muted" type="button" aria-label="语音">◌</button>
                <button className="composer-submit" type="submit" aria-label="发送">↑</button>
              </div>
            </div>
          </form>
          <div className="prompt-context-bar">
            <span className="prompt-context-pill">EnterpriseAgentHub</span>
            <span className="prompt-context-pill">{workspace.loggedIn ? "在线工作区" : "本地工作"}</span>
            <span className="prompt-context-pill">{workspace.loggedIn ? roleLabel(workspace.currentUser, ui.language) : "guest"}</span>
          </div>
        </div>
      </section>
    </section>
  );
}

export function HomeSection({ workspace, ui }: SectionProps) {
  return (
    <div className="stage-page home-page">
      <HomeHero workspace={workspace} ui={ui} />
    </div>
  );
}

function CommunitySkillCard({ workspace, ui, skill }: SectionProps & { skill: SkillSummary }) {
  const metadataChips = [
    skill.localVersion ? `本地 v${skill.localVersion}` : null,
    skill.authorName,
    skill.authorDepartment,
    `v${skill.version}`
  ].filter(Boolean);

  return (
    <article
      className="market-card"
      role="button"
      tabIndex={0}
      onClick={() => ui.openSkillDetail(skill.skillID, "community")}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          ui.openSkillDetail(skill.skillID, "community");
        }
      }}
    >
      <div className="market-card-body">
        <div className="market-card-head">
          <div className="market-card-title-row">
            <InitialBadge label={skill.displayName} />
            <div className="market-card-title">
              <strong>{skill.displayName}</strong>
              <p>{skill.description}</p>
            </div>
          </div>
          <TagPill tone={statusTone(skill)}>{statusLabel(skill, ui.language)}</TagPill>
        </div>
        <div className="pill-row">
          <TagPill tone="neutral">{skill.category}</TagPill>
          {skill.tags.slice(0, 2).map((tag) => <TagPill key={tag} tone="info">{tag}</TagPill>)}
        </div>
        <div className="market-metadata">
          {metadataChips.map((item) => <span key={item}>{item}</span>)}
        </div>
        <div className="market-metrics">
          <button
            className="market-metric-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void workspace.toggleStar(skill.skillID);
            }}
            aria-label={skill.starred ? `取消收藏 ${skill.displayName}` : `收藏 ${skill.displayName}`}
          >
            <Star size={14} fill={skill.starred ? "currentColor" : "none"} />
            <span>{formatMetricCount(skill.starCount, ui.language)}</span>
          </button>
          <span>
            <Download size={14} />
            {formatMetricCount(skill.downloadCount, ui.language)}
          </span>
        </div>
      </div>
    </article>
  );
}

function Leaderboard({ workspace, ui }: SectionProps) {
  const leaderboard = useMemo(
    () => [...workspace.marketSkills].sort((left, right) => right.downloadCount - left.downloadCount || right.starCount - left.starCount).slice(0, 6),
    [workspace.marketSkills]
  );

  return (
    <aside className="stage-panel community-side-panel">
      <SectionHeader eyebrow="Leaderboard" title="社区热榜" description="保持更紧凑的榜单行，方便快速比较热门 Skill。" />
      {leaderboard.length === 0 ? <SectionEmpty title="暂无榜单数据" body="登录后会根据市场真实数据展示热榜。" /> : null}
      <div className="stack-list compact">
        {leaderboard.map((skill) => (
          <button className="leaderboard-row" key={skill.skillID} type="button" onClick={() => ui.openSkillDetail(skill.skillID, "community")}>
            <InitialBadge label={skill.displayName} />
            <span className="leaderboard-copy">
              <strong>{skill.displayName}</strong>
              <small>{skill.category}</small>
            </span>
            <span className="leaderboard-metrics">
              <small>☆ {formatMetricCount(skill.starCount, ui.language)}</small>
              <small>↓ {formatMetricCount(skill.downloadCount, ui.language)}</small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CommunityPlaceholder({ title }: { title: string }) {
  return (
    <section className="stage-panel placeholder-panel">
      <strong>{title} 预留入口</strong>
      <p>当前版本保留导航与占位态，后续再接入真实 MCP / 插件功能。</p>
    </section>
  );
}

function CommunityPublisherWorkspace({
  workspace,
  ui,
  pane
}: SectionProps & { pane: "publish" | "mine" }) {
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
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const publishPrecheck = buildPublishPrecheck(draft);

  const selectedPublisherSkill =
    workspace.publisherData.publisherSkills.find((skill) => skill.latestSubmissionID === workspace.publisherData.selectedPublisherSubmissionID)
    ?? workspace.publisherData.publisherSkills[0]
    ?? null;
  const selectedSubmission = workspace.publisherData.selectedPublisherSubmission;

  const composerTitle =
    draft.submissionType === "publish"
      ? "新建发布"
      : draft.submissionType === "update"
        ? "发布新版本"
        : "提交权限变更";

  const canSubmitPermissionChange =
    draft.skillID.trim().length > 0 &&
    draft.displayName.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    (draft.scope !== "selected_departments" || draft.selectedDepartmentIDs.length > 0);
  const canSubmitDraft = draft.submissionType === "permission_change" ? canSubmitPermissionChange : publishPrecheck.canSubmit;
  const folderInputProps = { webkitdirectory: "" } as { [key: string]: string };

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
    ui.openCommunityPane("publish");
  }

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
    ui.openCommunityPane("mine");
  }

  async function loadSubmissionFileContent(relativePath: string) {
    if (!selectedSubmission) {
      throw new Error("未选择提交记录");
    }
    return workspace.publisherData.getSubmissionFileContent(selectedSubmission.submissionID, relativePath);
  }

  if (!workspace.loggedIn) {
    return (
      <AuthGateCard
        title="登录后进入作者工作台"
        body="发布、更新、权限变更与提交流程都统一保留在社区内部。"
        onLogin={() => workspace.requireAuth("publisher")}
      />
    );
  }

  if (pane === "publish") {
    return (
      <section className="stage-panel publisher-stage-panel">
        <div className="publisher-step-row">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              className={wizardStep === step ? "btn btn-primary btn-small" : "btn btn-small"}
              type="button"
              onClick={() => setWizardStep(step as 1 | 2 | 3)}
            >
              {step === 1 ? "1. 基础信息" : step === 2 ? "2. 包上传与校验" : "3. 最终确认"}
            </button>
          ))}
        </div>

        <form className="form-stack" onSubmit={submitDraft}>
          <SectionHeader eyebrow="Publisher" title={composerTitle} description="发布、更新与权限变更统一在社区内起草，不再单独弹出覆盖层。" />

          {wizardStep === 1 ? (
            <>
              <SelectField label="提交类型" value={draft.submissionType} options={["publish", "update", "permission_change"]} onChange={(value) => resetDraft(value as PublishDraft["submissionType"], selectedPublisherSkill ?? undefined)} />
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
                <button className="btn btn-primary" type="button" onClick={() => setWizardStep(2)} disabled={draft.skillID.trim().length === 0}>
                  下一步：组装校验
                </button>
                <button className="btn" type="button" onClick={() => resetDraft(draft.submissionType, selectedPublisherSkill ?? undefined)}>
                  重置
                </button>
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
                    {draft.files.length === 0 ? <p>选择 ZIP 或文件夹后，在这里预校验内容。</p> : null}
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
                    <small>审核通过前会继续沿用最新历史版本，仅变更授权范围与公开级别。</small>
                  </span>
                </div>
              )}
              <div className="inline-actions wrap">
                <button className="btn" type="button" onClick={() => setWizardStep(1)}>上一步</button>
                <button className="btn btn-primary" type="button" onClick={() => setWizardStep(3)} disabled={draft.submissionType !== "permission_change" && !publishPrecheck.canSubmit}>
                  下一步：最终确认
                </button>
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
                    <small>请返回前一步补齐信息或上传包文件。</small>
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

  return (
    <div className="publisher-detail-layout publisher-page-layout">
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

      <section className="stage-panel detail-panel wide inspector-panel">
        {!selectedSubmission ? (
          <SectionEmpty title="选择一条提交查看详情" body="右侧会显示提交详情、包预览、预检查和历史记录。" />
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
  );
}

export function CommunitySection({ workspace, ui }: SectionProps) {
  const categories = ["all", ...workspace.categories];
  const currentPane = {
    skills: { title: "Skills", description: "搜索、排序和筛选 Skill，右侧热榜保持紧凑扫描节奏。", icon: <Sparkles size={16} /> },
    mcp: { title: "MCP", description: "预留后续能力入口，当前只保留结构和占位语义。", icon: <Sparkles size={16} /> },
    plugins: { title: "插件", description: "预留后续能力入口，保持与社区主舞台一致的布局骨架。", icon: <Sparkles size={16} /> },
    publish: { title: "发布", description: "在社区内部直接起草发布、更新和权限变更，不再弹出独立发布中心。", icon: <Upload size={16} /> },
    mine: { title: "我的", description: "查看我发布的 Skill、审核状态、包预览与上下架动作。", icon: <Users size={16} /> }
  }[ui.communityPane];

  const discoverEntries = [
    { id: "skills", label: "Skill", note: String(workspace.marketSkills.length) },
    { id: "mcp", label: "MCP", note: "预留" },
    { id: "plugins", label: "插件", note: "预留" }
  ] as const;
  const authorEntries = [
    { id: "publish", label: "发布", note: workspace.loggedIn ? "起草" : "登录后可用" },
    { id: "mine", label: "我的", note: workspace.loggedIn ? String(workspace.publisherData.publisherSkills.length) : "登录后可用" }
  ] as const;

  return (
    <div className="stage-page workspace-page">
      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <div className="sidebar-title">社区入口</div>
          {discoverEntries.map((item) => (
            <button
              key={item.id}
              className={ui.communityPane === item.id ? "sidebar-switch active" : "sidebar-switch"}
              type="button"
              onClick={() => ui.openCommunityPane(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.note}</small>
            </button>
          ))}
          <div className="sidebar-divider" />
          {authorEntries.map((item) => (
            <button
              key={item.id}
              className={ui.communityPane === item.id ? "sidebar-switch active" : "sidebar-switch"}
              type="button"
              onClick={() => ui.openCommunityPane(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.note}</small>
            </button>
          ))}
        </aside>
        <div className="workspace-main">
          <WorkspaceToolbar icon={currentPane.icon} title={currentPane.title} description={currentPane.description} />
          {ui.communityPane === "skills" ? (
            <div className="community-content">
              {!workspace.loggedIn ? (
                <AuthGateCard
                  title="登录后同步完整社区"
                  body="游客状态下优先展示本机与缓存数据。登录后可搜索完整市场、安装 Skill 和进入发布中心。"
                  onLogin={() => workspace.requireAuth("market")}
                />
              ) : null}
              <section className="stage-panel community-filter-panel">
                <div className="search-sort-row">
                  <label className="search-shell">
                    <Search size={16} />
                    <input
                      aria-label="搜索社区 Skill"
                      type="search"
                      value={workspace.filters.query}
                      placeholder="搜索名称、描述、标签、作者或部门"
                      onChange={(event) => workspace.setFilters((current) => ({ ...current, query: event.target.value }))}
                    />
                  </label>
                  <SelectField
                    label="排序"
                    value={workspace.filters.sort}
                    options={[
                      { value: "composite", label: "综合排序" },
                      { value: "latest_published", label: "最新发布" },
                      { value: "recently_updated", label: "最近更新" },
                      { value: "download_count", label: "下载量" },
                      { value: "star_count", label: "Star 数" },
                      { value: "relevance", label: "相关度" }
                    ]}
                    onChange={(value) => workspace.setFilters((current) => ({ ...current, sort: value as MarketFilters["sort"] }))}
                  />
                </div>
                <div className="tag-row">
                  {categories.map((tag) => {
                    const active = workspace.filters.category === tag;
                    const label = tag === "all" ? "全部" : tag;
                    return (
                      <button
                        key={tag}
                        className={active ? "tag-filter active" : "tag-filter"}
                        type="button"
                        onClick={() => workspace.setFilters((current) => ({ ...current, category: tag }))}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>
              <div className="community-grid-layout">
                <section className="stage-panel">
                  {workspace.marketSkills.length === 0 ? <SectionEmpty title="没有符合筛选的 Skill" body="换一个搜索词或标签再试一次。" /> : null}
                  <div className="market-grid">
                    {workspace.marketSkills.map((skill) => (
                      <CommunitySkillCard key={skill.skillID} workspace={workspace} ui={ui} skill={skill} />
                    ))}
                  </div>
                </section>
                <Leaderboard workspace={workspace} ui={ui} />
              </div>
            </div>
          ) : null}
          {ui.communityPane === "mcp" || ui.communityPane === "plugins" ? (
            <CommunityPlaceholder title={ui.communityPane === "mcp" ? "MCP" : "插件"} />
          ) : null}
          {ui.communityPane === "publish" || ui.communityPane === "mine" ? (
            <CommunityPublisherWorkspace workspace={workspace} ui={ui} pane={ui.communityPane} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SkillDetailStage({
  workspace,
  ui,
  detail
}: SectionProps & { detail: { skillID: string; source: TopLevelSection } }) {
  const skill =
    workspace.skills.find((item) => item.skillID === detail.skillID)
    ?? workspace.installedSkills.find((item) => item.skillID === detail.skillID)
    ?? workspace.selectedSkill;

  if (!skill) {
    return (
      <div className="stage-page workspace-page">
        <SectionEmpty title="没有找到这个 Skill" body="返回上一级后重新选择一个 Skill。" />
      </div>
    );
  }

  const primaryAction = primaryMarketAction(skill);
  const sourceLabel =
    detail.source === "community"
      ? "社区"
      : detail.source === "local"
        ? "本地"
        : detail.source === "manage"
          ? "管理"
          : "主页";

  function handlePrimaryAction() {
    if ("disabled" in primaryAction) return;
    if (primaryAction.action === "install") {
      ui.openInstallConfirm(skill, "install");
      return;
    }
    if (primaryAction.action === "update") {
      ui.openInstallConfirm(skill, "update");
      return;
    }
    ui.openTargetsModal(skill);
  }

  return (
    <div className="stage-page workspace-page skill-stage-page">
      <WorkspaceToolbar
        icon={<Sparkles size={16} />}
        title={skill.displayName}
        description={`${skill.skillID} · ${skill.authorName} · ${skill.authorDepartment}`}
        actions={<button className="btn" type="button" onClick={ui.closeSkillDetail}>返回{sourceLabel}</button>}
      />

      <div className="skill-detail-layout skill-stage-layout">
        <section className="stage-panel skill-detail-main-panel">
          <div className="detail-hero">
            <div className="detail-symbol-card">
              <InitialBadge label={skill.displayName} large />
            </div>
            <div className="detail-hero-copy">
              <div className="pill-row">
                <TagPill tone={statusTone(skill)}>{statusLabel(skill, ui.language)}</TagPill>
                <TagPill tone={skill.riskLevel === "high" ? "danger" : skill.riskLevel === "medium" ? "warning" : "info"}>{riskLabel(skill, ui.language)}</TagPill>
                <TagPill tone="info">v{skill.version}</TagPill>
              </div>
              <h2>{skill.displayName}</h2>
              <p>{skill.description}</p>
            </div>
          </div>

          <div className="definition-grid split detail-metric-grid">
            <div><dt>Star</dt><dd>{skill.starCount}</dd></div>
            <div><dt>下载量</dt><dd>{skill.downloadCount}</dd></div>
            <div><dt>兼容工具</dt><dd>{skill.compatibleTools.length}</dd></div>
            <div><dt>最近更新</dt><dd>{formatDate(skill.currentVersionUpdatedAt, ui.language)}</dd></div>
          </div>

          <div className="detail-block">
            <h3>说明</h3>
            <p>{skill.readme || skill.reviewSummary || "当前版本可从这里查看兼容性、启用位置和主要动作。"}</p>
          </div>

          <div className="detail-block">
            <h3>兼容与标签</h3>
            <div className="pill-row">
              <TagPill tone="neutral">{skill.category}</TagPill>
              {skill.tags.map((tag) => <TagPill key={tag} tone="info">{tag}</TagPill>)}
              {skill.compatibleTools.map((tool) => <TagPill key={tool} tone="neutral">{tool}</TagPill>)}
            </div>
          </div>
        </section>

        <aside className="stage-panel detail-panel inspector-panel">
          <div className="detail-block">
            <div className="inspector-kicker">当前选中</div>
            <strong>{skill.displayName}</strong>
            <p>{skill.authorName} · {skill.authorDepartment}</p>
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

          <div className="detail-block">
            <h3>最近变化</h3>
            <p>{skill.reviewSummary || "当前版本已准备就绪，可继续安装、更新或调整启用范围。"}</p>
          </div>

          <div className="inline-actions wrap inspector-actions">
            <button className="btn btn-primary" type="button" disabled={"disabled" in primaryAction} onClick={handlePrimaryAction}>
              {primaryAction.label}
            </button>
            {skill.localVersion ? (
              <button className="btn" type="button" onClick={() => ui.openUninstallConfirm(skill)}>
                卸载
              </button>
            ) : null}
            <button className="btn" type="button" onClick={() => void workspace.toggleStar(skill.skillID)}>
              {skill.starred ? "取消收藏" : "收藏"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LocalSkillDetail({ workspace, ui, skill }: SectionProps & { skill: SkillSummary }) {
  const issues = ui.installedView.installedSkillIssuesByID[skill.skillID] ?? [];
  const primaryAction = skill.installState === "update_available" ? "更新" : "调整范围";

  return (
    <aside className="detail-panel inspector-panel">
      <div className="detail-symbol-card">
        <InitialBadge label={skill.displayName} large />
      </div>
      <div className="detail-block">
        <div className="inspector-kicker">当前选中</div>
        <strong>{skill.displayName}</strong>
        <small>{skill.authorName} · {skill.authorDepartment}</small>
      </div>
      <div className="pill-row">
        <TagPill tone={statusTone(skill)}>{statusLabel(skill, ui.language)}</TagPill>
        <TagPill tone={skill.riskLevel === "high" ? "danger" : skill.riskLevel === "medium" ? "warning" : "info"}>{riskLabel(skill, ui.language)}</TagPill>
      </div>
      <p>{skill.readme ?? skill.description}</p>
      <div className="detail-block">
        <h3>已启用位置</h3>
        {skill.enabledTargets.length === 0 ? <p>当前还没有启用目标。</p> : null}
        <div className="stack-list compact">
          {skill.enabledTargets.map((target) => (
            <div className="micro-row" key={`${target.targetType}:${target.targetID}`}>
              <strong>{target.targetName}</strong>
              <small>{target.targetPath}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="detail-block">
        <h3>当前提示</h3>
        <p>{issues[0] ?? "从这里处理更新、启用范围和卸载动作。"}</p>
      </div>
      <div className="inline-actions wrap">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => (skill.installState === "update_available" ? ui.openInstallConfirm(skill, "update") : ui.openTargetsModal(skill))}
        >
          {primaryAction}
        </button>
        <button className="btn" type="button" onClick={() => ui.openSkillDetail(skill.skillID, "local")}>
          查看完整详情
        </button>
        <button className="btn btn-danger" type="button" onClick={() => ui.openUninstallConfirm(skill)}>
          卸载
        </button>
      </div>
    </aside>
  );
}

function LocalSkillRow({
  skill,
  workspace,
  ui,
  active
}: {
  skill: SkillSummary;
  workspace: P1WorkspaceState;
  ui: DesktopUIState;
  active: boolean;
}) {
  const issues = ui.installedView.installedSkillIssuesByID[skill.skillID] ?? [];
  const primaryAction = skill.installState === "update_available" ? "更新" : "启用";

  return (
    <article className={active ? "local-item active" : "local-item"} onClick={() => workspace.selectSkill(skill.skillID)}>
      <span className="entity-mark">{skillInitials(skill.displayName)}</span>
      <div className="list-row-copy">
        <strong>{skill.displayName}</strong>
        <p>{skill.description}</p>
        <div className="meta-strip">
          <span className="metric-chip">{skill.authorName}</span>
          <span className="metric-chip">{skill.authorDepartment}</span>
          <span className="metric-chip">本地 {skill.localVersion ?? "-"}</span>
          <span className={`status-chip ${statusTone(skill)}`}>{statusLabel(skill, ui.language)}</span>
        </div>
        {issues.length > 0 ? <div className="status-chip warning">{issues[0]}</div> : null}
      </div>
      <div className="skill-side">
        <div className="skill-actions">
          <button
            className="btn btn-primary btn-small"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (skill.installState === "update_available") {
                ui.openInstallConfirm(skill, "update");
                return;
              }
              ui.openTargetsModal(skill);
            }}
          >
            {primaryAction}
          </button>
          <button
            className="btn btn-small"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              ui.openSkillDetail(skill.skillID, "local");
            }}
          >
            详情
          </button>
          <button
            className="btn btn-danger btn-small"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              ui.openUninstallConfirm(skill);
            }}
          >
            卸载
          </button>
        </div>
        <div className="metric-row compact">
          <span className="metric-chip">目标 {skill.enabledTargets.length}</span>
          <span className="metric-chip">{formatDate(skill.currentVersionUpdatedAt, ui.language)}</span>
        </div>
      </div>
    </article>
  );
}

function LocalToolsAndProjects({
  workspace,
  ui,
  pane
}: SectionProps & { pane: "tools" | "projects" }) {
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const entities = pane === "tools"
    ? workspace.tools.map((tool) => ({
        id: tool.toolID,
        title: tool.name,
        subtitle: transformStrategyLabel(tool.transformStrategy, ui.language),
        body: tool.skillsPath || "未配置",
        meta: adapterStatusLabel(tool.adapterStatus, ui.language)
      }))
    : workspace.projects.map((project) => ({
        id: project.projectID,
        title: project.name,
        subtitle: project.projectPath,
        body: project.skillsPath,
        meta: project.enabled ? "已启用" : "已停用"
      }));
  const filteredEntities = entities.filter((entity) => {
    if (!query.trim()) return true;
    const keyword = `${entity.title} ${entity.subtitle} ${entity.body} ${entity.meta}`.toLowerCase();
    return keyword.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    setSelectedID((current) => (filteredEntities.some((entity) => entity.id === current) ? current : filteredEntities[0]?.id ?? null));
  }, [filteredEntities]);

  const selectedEntity = filteredEntities.find((entity) => entity.id === selectedID) ?? null;
  const selectedTool = pane === "tools" ? workspace.tools.find((tool) => tool.toolID === selectedID) ?? null : null;
  const selectedProject = pane === "projects" ? workspace.projects.find((project) => project.projectID === selectedID) ?? null : null;

  return (
    <div className="list-detail-shell">
      <section className="stage-panel list-panel local-list-panel">
        <div className="local-filter-shell">
          <label className="search-shell">
            <Search size={16} />
            <input
              aria-label={pane === "tools" ? "搜索工具" : "搜索项目"}
              type="search"
              value={query}
              placeholder={pane === "tools" ? "搜索工具名称或安装路径" : "搜索项目名称或项目路径"}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="selection-list">
          {filteredEntities.length === 0 ? (
            <SectionEmpty title={pane === "tools" ? "还没有工具配置" : "还没有项目配置"} body={pane === "tools" ? "添加工具后，这里会显示路径、状态和已启用 Skill。" : "添加项目后，这里会显示项目路径和当前生效 Skill。"} />
          ) : null}
          {filteredEntities.map((entity) => (
            <article key={entity.id} className={selectedID === entity.id ? "local-item active" : "local-item"} onClick={() => setSelectedID(entity.id)}>
              <span className={pane === "tools" ? "entity-mark" : "entity-mark soft"}>{skillInitials(entity.title)}</span>
              <div className="list-row-copy">
                <strong>{entity.title}</strong>
                <p>{entity.subtitle}</p>
                <div className="meta-strip">
                  <span className="metric-chip">{entity.meta}</span>
                  <span className="metric-chip">{entity.body}</span>
                </div>
              </div>
              <div className="skill-side">
                <div className="skill-actions">
                  {pane === "tools" ? (
                    <>
                      <button
                        className="btn btn-small"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const tool = workspace.tools.find((item) => item.toolID === entity.id);
                          if (tool) {
                            ui.openToolEditor(tool);
                          }
                        }}
                      >
                        编辑路径
                      </button>
                      <button className="btn btn-small" type="button" onClick={(event) => { event.stopPropagation(); ui.openDiagnosticsOverlay(); }}>
                        重新检测
                      </button>
                    </>
                  ) : null}
                  {pane === "projects" ? (
                    <>
                      <button
                        className="btn btn-small"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const project = workspace.projects.find((item) => item.projectID === entity.id);
                          if (project) {
                            ui.openProjectEditor(project);
                          }
                        }}
                      >
                        启用管理
                      </button>
                      <button className="btn btn-small" type="button" onClick={(event) => { event.stopPropagation(); ui.openDiagnosticsOverlay(); }}>
                        查看路径
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="detail-panel inspector-panel">
        {!selectedEntity ? (
          <SectionEmpty title="选择一个对象查看详情" body="右侧会显示路径、状态和可执行动作。" />
        ) : pane === "tools" && selectedTool ? (
          <>
            <div className="detail-symbol-card">
              <InitialBadge label={selectedEntity.title} large />
            </div>
            <div className="detail-block">
              <div className="inspector-kicker">当前选中</div>
              <strong>{selectedEntity.title}</strong>
              <small>{transformStrategyLabel(selectedTool.transformStrategy, ui.language)}</small>
            </div>
            <div className="pill-row">
              <TagPill tone={selectedTool.adapterStatus === "detected" ? "success" : selectedTool.adapterStatus === "manual" ? "info" : "warning"}>
                {adapterStatusLabel(selectedTool.adapterStatus, ui.language)}
              </TagPill>
              <TagPill tone="info">{detectionMethodLabel(selectedTool.detectionMethod, ui.language)}</TagPill>
            </div>
            <div className="detail-block">
              <h3>路径与状态</h3>
              <div className="stack-list compact">
                <small>配置路径：{selectedTool.configPath || "未配置"}</small>
                <small>自动检测：{selectedTool.detectedPath ?? "未命中"}</small>
                <small>手动覆盖：{selectedTool.configuredPath ?? "未覆盖"}</small>
                <small>Skills 路径：{selectedTool.skillsPath || "未配置"}</small>
                <small>最近扫描：{formatDate(selectedTool.lastScannedAt ?? null, ui.language)}</small>
              </div>
            </div>
            <div className="inline-actions wrap">
              <button className="btn btn-primary" type="button" onClick={() => ui.openToolEditor(selectedTool)}>
                修改路径
              </button>
              <button className="btn" type="button" onClick={() => ui.openDiagnosticsOverlay()}>
                查看诊断
              </button>
            </div>
          </>
        ) : selectedProject ? (
          <>
            <div className="detail-symbol-card">
              <InitialBadge label={selectedEntity.title} large />
            </div>
            <div className="detail-block">
              <div className="inspector-kicker">当前选中</div>
              <strong>{selectedEntity.title}</strong>
              <small>{selectedProject.enabled ? "已启用" : "已停用"}</small>
            </div>
            <div className="detail-block">
              <h3>项目路径</h3>
              <div className="stack-list compact">
                <small>{selectedProject.projectPath}</small>
                <small>skills 路径：{selectedProject.skillsPath}</small>
                <small>创建于 {formatDate(selectedProject.createdAt, ui.language)}</small>
                <small>更新于 {formatDate(selectedProject.updatedAt, ui.language)}</small>
              </div>
            </div>
            <div className="inline-actions wrap">
              <button className="btn btn-primary" type="button" onClick={() => ui.openProjectEditor(selectedProject)}>
                修改路径
              </button>
              <button className="btn" type="button" onClick={() => ui.openDiagnosticsOverlay()}>
                查看诊断
              </button>
            </div>
          </>
        ) : (
          <SectionEmpty title="选择一个对象查看详情" body="右侧会显示路径、状态和可执行动作。" />
        )}
      </aside>
    </div>
  );
}

export function LocalSection({ workspace, ui }: SectionProps) {
  const selectedSkill = useMemo(() => {
    const filtered = ui.installedView.filteredInstalledSkills;
    return filtered.find((skill) => skill.skillID === workspace.selectedSkillID) ?? filtered[0] ?? null;
  }, [ui.installedView.filteredInstalledSkills, workspace.selectedSkillID]);

  useEffect(() => {
    if (selectedSkill && workspace.selectedSkillID !== selectedSkill.skillID) {
      workspace.selectSkill(selectedSkill.skillID);
    }
  }, [selectedSkill, workspace]);

  const sidebarItems = [
    { id: "skills", label: "Skills", count: workspace.installedSkills.length },
    { id: "tools", label: "工具", count: workspace.tools.length },
    { id: "projects", label: "项目", count: workspace.projects.length }
  ] as const;

  return (
    <div className="stage-page workspace-page">
      <div className="workspace-layout workspace-grid local-workspace">
        <aside className="workspace-sidebar side-switcher">
          <div className="sidebar-title">本地入口</div>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={ui.localPane === item.id ? "sidebar-switch active" : "sidebar-switch"}
              type="button"
              onClick={() => ui.openLocalPane(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.count}</small>
            </button>
          ))}
        </aside>
        <div className="workspace-main local-main">
          <WorkspaceToolbar
            icon={ui.localPane === "skills" ? <ShieldCheck size={16} /> : ui.localPane === "tools" ? <CircleGauge size={16} /> : <Link2 size={16} />}
            title={ui.localPane === "skills" ? "Skills" : ui.localPane === "tools" ? "工具" : "项目"}
            description={
              ui.localPane === "skills"
                ? "管理已安装 Skill、本机启用状态、更新窗口和异常摘要。"
                : ui.localPane === "tools"
                  ? "查看工具安装路径、Skills 目录和启用落点。"
                  : "管理项目级路径设置、覆盖关系和启用落点。"
            }
            actions={
              <>
              <button className="btn" type="button" onClick={() => void workspace.scanLocalTargets()}>
                <RefreshCw size={14} />
                扫描
              </button>
              {ui.localPane === "skills" ? (
                <button className="btn" type="button" onClick={() => ui.openDiagnosticsOverlay()}>
                  <AlertTriangle size={14} />
                  诊断
                </button>
              ) : null}
              {ui.localPane === "tools" ? (
                <button className="btn btn-primary" type="button" onClick={() => ui.openToolEditor()}>
                  <Plus size={14} />
                  添加工具
                </button>
              ) : null}
              {ui.localPane === "projects" ? (
                <button className="btn btn-primary" type="button" onClick={() => ui.openProjectEditor()}>
                  <FolderPlus size={14} />
                  添加项目
                </button>
              ) : null}
              </>
            }
          />

          {ui.localPane === "skills" ? (
            <div className="list-detail-shell local-browser has-detail">
              <section className="stage-panel list-panel local-list-panel">
                <div className="local-filter-shell">
                  <label className="search-shell">
                    <Search size={16} />
                    <input
                      aria-label="搜索本地 Skill"
                      type="search"
                      value={ui.installedView.installedQuery}
                      placeholder="搜索 Skill 名称、skillID 或异常摘要"
                      onChange={(event) => ui.installedView.setInstalledQuery(event.target.value)}
                    />
                  </label>
                  <div className="inline-actions wrap">
                    {([
                      ["all", "全部"],
                      ["enabled", "已启用"],
                      ["updates", "待更新"],
                      ["scope_restricted", "权限收缩"],
                      ["issues", "异常"]
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        className={ui.installedView.installedFilter === key ? "btn btn-primary btn-small" : "btn btn-small"}
                        type="button"
                        onClick={() => ui.installedView.setInstalledFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="selection-list">
                  {ui.installedView.filteredInstalledSkills.length === 0 ? (
                    <SectionEmpty title="没有符合条件的本地 Skill" body="切换筛选或清空搜索词后再试一次。" />
                  ) : null}
                  {ui.installedView.filteredInstalledSkills.map((skill) => {
                    return (
                      <LocalSkillRow
                        key={skill.skillID}
                        skill={skill}
                        workspace={workspace}
                        ui={ui}
                        active={selectedSkill?.skillID === skill.skillID}
                      />
                    );
                  })}
                </div>
              </section>
              {selectedSkill ? <LocalSkillDetail workspace={workspace} ui={ui} skill={selectedSkill} /> : <aside className="detail-panel"><SectionEmpty title="选择一个 Skill 查看详情" body="右侧会展示说明、启用位置和主要动作。" /></aside>}
            </div>
          ) : null}

          {ui.localPane === "tools" ? <LocalToolsAndProjects workspace={workspace} ui={ui} pane="tools" /> : null}
          {ui.localPane === "projects" ? <LocalToolsAndProjects workspace={workspace} ui={ui} pane="projects" /> : null}
        </div>
      </div>
    </div>
  );
}

function ManageSidebar({ ui, workspace }: { ui: DesktopUIState; workspace: P1WorkspaceState }) {
  const items = [
    { id: "reviews", label: "审核", count: workspace.adminData.reviews.length },
    { id: "skills", label: "Skills", count: workspace.adminData.adminSkills.length },
    { id: "departments", label: "部门", count: flattenDepartments(workspace.adminData.departments).length },
    { id: "users", label: "用户", count: workspace.adminData.adminUsers.length }
  ] as const;

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-title">管理入口</div>
      {items.map((item) => (
        <button
          key={item.id}
          className={ui.managePane === item.id ? "sidebar-switch active" : "sidebar-switch"}
          type="button"
          onClick={() => ui.openManagePane(item.id)}
        >
          <span>{item.label}</span>
          <small>{item.count}</small>
        </button>
      ))}
    </aside>
  );
}

function ManageReviewsPane({ workspace, ui }: SectionProps) {
  useEffect(() => {
    if (!workspace.adminData.selectedReviewID && workspace.adminData.reviews[0]) {
      workspace.adminData.setSelectedReviewID(workspace.adminData.reviews[0].reviewID);
    }
  }, [workspace]);

  const selectedReview = workspace.adminData.selectedReview;

  const loadReviewFileContent = async (relativePath: string) => {
    if (!selectedReview) {
      throw new Error("未选择审核单");
    }
    return workspace.adminData.getReviewFileContent(selectedReview.reviewID, relativePath);
  };

  return (
    <div className="manage-pane-grid reviews">
      <section className="stage-panel list-panel">
        <div className="inline-actions wrap">
          {([
            ["pending", "待审核"],
            ["in_review", "审核中"],
            ["reviewed", "已审核"]
          ] as const).map(([tab, label]) => (
            <button key={tab} className={ui.reviewTab === tab ? "btn btn-primary btn-small" : "btn btn-small"} type="button" onClick={() => ui.setReviewTab(tab)}>
              {label}
            </button>
          ))}
        </div>
        <div className="stack-list">
          {ui.filteredReviews.length === 0 ? <SectionEmpty title="当前没有审核单" body="待审核、审核中和已审核会根据当前筛选展示在这里。" /> : null}
          {ui.filteredReviews.map((review) => (
            <button
              key={review.reviewID}
              className={selectedReview?.reviewID === review.reviewID ? "selection-row active" : "selection-row"}
              type="button"
              onClick={() => workspace.adminData.setSelectedReviewID(review.reviewID)}
            >
              <div className="selection-row-main">
                <InitialBadge label={review.skillDisplayName} />
                <span>
                  <strong>{review.skillDisplayName}</strong>
                  <small>{review.submitterName} · {submissionTypeLabel(review.reviewType, ui.language)}</small>
                </span>
              </div>
              <span className="selection-row-meta">
                <TagPill tone={review.reviewStatus === "reviewed" ? "success" : review.reviewStatus === "in_review" ? "warning" : "info"}>
                  {workflowStateLabel(review.workflowState, ui.language)}
                </TagPill>
                <small>{formatDate(review.submittedAt, ui.language)}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="stage-panel detail-panel wide inspector-panel manage-review-detail">
        {!selectedReview ? (
          <SectionEmpty title="选择一条审核单查看详情" body="这里会展示预检查结果、审核动作和文件预览。" />
        ) : (
          <>
            <div className="detail-hero compact">
              <div className="detail-symbol-card manage-symbol-card">
                <InitialBadge label={selectedReview.skillDisplayName} large />
              </div>
              <div className="detail-hero-copy">
                <div className="pill-row">
                  <TagPill tone={selectedReview.reviewStatus === "reviewed" ? "success" : selectedReview.reviewStatus === "in_review" ? "warning" : "info"}>
                    {workflowStateLabel(selectedReview.workflowState, ui.language)}
                  </TagPill>
                  <TagPill tone={selectedReview.riskLevel === "high" ? "danger" : selectedReview.riskLevel === "medium" ? "warning" : "info"}>
                    {selectedReview.riskLevel}
                  </TagPill>
                  <TagPill tone="neutral">{submissionTypeLabel(selectedReview.reviewType, ui.language)}</TagPill>
                </div>
                <h3>{selectedReview.skillDisplayName}</h3>
                <p>{selectedReview.description}</p>
              </div>
            </div>
            <div className="definition-grid split">
              <div><dt>提交人</dt><dd>{selectedReview.submitterName}</dd></div>
              <div><dt>部门</dt><dd>{selectedReview.submitterDepartmentName}</dd></div>
              <div><dt>当前版本</dt><dd>{selectedReview.currentVersion ?? "-"}</dd></div>
              <div><dt>目标版本</dt><dd>{selectedReview.requestedVersion ?? "-"}</dd></div>
              <div><dt>公开级别</dt><dd>{selectedReview.requestedVisibilityLevel ?? "-"}</dd></div>
              <div><dt>当前审核人</dt><dd>{selectedReview.currentReviewerName ?? "未锁定"}</dd></div>
            </div>
            <div className="detail-block">
              <h3>预检查结果</h3>
              {selectedReview.precheckResults.length === 0 ? (
                <p>系统初审尚未返回结果。</p>
              ) : (
                <div className="stack-list compact">
                  {selectedReview.precheckResults.map((item) => (
                    <div className="micro-row" key={item.id}>
                      <strong>{item.label}</strong>
                      <small>{item.message}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="detail-block">
              <h3>审核动作</h3>
              <label className="field">
                <span>说明</span>
                <textarea rows={3} placeholder="补充审核意见、退回原因或通过说明" />
              </label>
              <div className="inline-actions wrap">
                {selectedReview.availableActions.map((action) => (
                  <button
                    key={action}
                    className={action === "approve" || action === "pass_precheck" ? "btn btn-primary btn-small" : "btn btn-small"}
                    type="button"
                    onClick={() => {
                      switch (action) {
                        case "claim":
                          void workspace.adminData.claimReview(selectedReview.reviewID);
                          break;
                        case "pass_precheck":
                          void workspace.adminData.passPrecheck(selectedReview.reviewID, "");
                          break;
                        case "approve":
                          void workspace.adminData.approveReview(selectedReview.reviewID, "");
                          break;
                        case "return_for_changes":
                          void workspace.adminData.returnReview(selectedReview.reviewID, "");
                          break;
                        case "reject":
                          void workspace.adminData.rejectReview(selectedReview.reviewID, "");
                          break;
                        case "withdraw":
                          break;
                      }
                    }}
                  >
                    {reviewActionLabel(action, ui.language)}
                  </button>
                ))}
              </div>
            </div>
            <PackagePreviewPanel
              files={selectedReview.packageFiles}
              packageURL={selectedReview.packageURL}
              downloadName={`${selectedReview.skillID}.zip`}
              loadContent={loadReviewFileContent}
              ui={ui}
            />
          </>
        )}
      </section>
    </div>
  );
}

function ManageSkillsPane({ workspace, ui }: SectionProps) {
  const [selectedSkillID, setSelectedSkillID] = useState<string | null>(null);
  const managedSkills = workspace.adminData.adminSkills;

  useEffect(() => {
    setSelectedSkillID((current) => (managedSkills.some((skill) => skill.skillID === current) ? current : managedSkills[0]?.skillID ?? null));
  }, [managedSkills]);

  const selectedSkill = managedSkills.find((skill) => skill.skillID === selectedSkillID) ?? null;
  const selectedRisk = selectedSkill ? getAdminSkillRiskLevel(selectedSkill) : "unknown";

  return (
    <div className="manage-pane-grid skills-workbench">
      <section className="stage-panel list-panel manage-list-panel">
        <div className="local-filter-shell">
          <div>
            <div className="eyebrow">Skill 治理列表</div>
            <p className="workspace-toolbar-desc">从真实管理数据选择 Skill，右侧汇总展示当前版本、风险与审核摘要。</p>
          </div>
          <div className="definition-grid split compact-metrics">
            <div><dt>总数</dt><dd>{managedSkills.length}</dd></div>
            <div><dt>已上架</dt><dd>{managedSkills.filter((skill) => skill.status === "published").length}</dd></div>
            <div><dt>已下架</dt><dd>{managedSkills.filter((skill) => skill.status === "delisted").length}</dd></div>
            <div><dt>已归档</dt><dd>{managedSkills.filter((skill) => skill.status === "archived").length}</dd></div>
          </div>
        </div>
        <div className="stack-list">
          {managedSkills.length === 0 ? <SectionEmpty title="暂无 Skill 数据" body="保持在线后会加载可管理范围内的 Skill 列表。" /> : null}
          {managedSkills.map((skill) => {
            const riskLevel = getAdminSkillRiskLevel(skill);
            return (
              <button
                key={skill.skillID}
                className={selectedSkill?.skillID === skill.skillID ? "selection-row active" : "selection-row"}
                type="button"
                onClick={() => setSelectedSkillID(skill.skillID)}
              >
                <div className="selection-row-main">
                  <InitialBadge label={skill.displayName} />
                  <span>
                    <strong>{skill.displayName}</strong>
                    <small>{getAdminSkillCategory(skill)} · {skill.publisherName} · {skill.departmentName}</small>
                  </span>
                </div>
                <span className="selection-row-meta">
                  <TagPill tone={skill.status === "published" ? "success" : skill.status === "delisted" ? "warning" : "neutral"}>{manageSkillStatusLabel(skill.status)}</TagPill>
                  <small>{manageRiskLabel(riskLevel)} · ☆ {skill.starCount} · ↓ {skill.downloadCount}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="detail-panel inspector-panel manage-summary-panel">
        {!selectedSkill ? (
          <SectionEmpty title="选择一个 Skill 查看详情" body="右侧会显示版本摘要、风险和可执行治理动作。" />
        ) : (
          <>
            <div className="detail-symbol-card manage-symbol-card">
              <InitialBadge label={selectedSkill.displayName} large />
            </div>
            <div className="detail-block">
              <div className="inspector-kicker">右侧摘要</div>
              <strong>{selectedSkill.displayName}</strong>
              <small>{selectedSkill.skillID} · v{selectedSkill.version}</small>
              <p>{getAdminSkillDescription(selectedSkill)}</p>
            </div>
            <div className="pill-row">
              <TagPill tone={selectedSkill.status === "published" ? "success" : selectedSkill.status === "delisted" ? "warning" : "neutral"}>{manageSkillStatusLabel(selectedSkill.status)}</TagPill>
              <TagPill tone={manageRiskTone(selectedRisk)}>{manageRiskLabel(selectedRisk)}</TagPill>
              <TagPill tone="neutral">{getAdminSkillCategory(selectedSkill)}</TagPill>
            </div>
            <div className="definition-grid split">
              <div><dt>发布者</dt><dd>{selectedSkill.publisherName}</dd></div>
              <div><dt>部门</dt><dd>{selectedSkill.departmentName}</dd></div>
              <div><dt>公开级别</dt><dd>{publishVisibilityLabel(selectedSkill.visibilityLevel, ui.language)}</dd></div>
              <div><dt>热度</dt><dd>☆ {selectedSkill.starCount} · ↓ {selectedSkill.downloadCount}</dd></div>
            </div>
            <div className="detail-block inspector-subsection">
              <h3>当前版本审核摘要</h3>
              <p>{getAdminSkillReviewSummary(selectedSkill)}</p>
            </div>
            <div className="inline-actions wrap">
              {selectedSkill.status === "published" ? (
                <button className="btn" type="button" onClick={() => void workspace.adminData.delistAdminSkill(selectedSkill.skillID)}>
                  下架
                </button>
              ) : null}
              {selectedSkill.status === "delisted" ? (
                <button className="btn" type="button" onClick={() => void workspace.adminData.relistAdminSkill(selectedSkill.skillID)}>
                  上架
                </button>
              ) : null}
              {selectedSkill.status !== "archived" ? (
                <button className="btn btn-danger" type="button" onClick={() => void workspace.adminData.archiveAdminSkill(selectedSkill.skillID)}>
                  归档
                </button>
              ) : null}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function ManageDepartmentsPane({ workspace }: { workspace: P1WorkspaceState }) {
  const [createName, setCreateName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [expandedDepartmentIDs, setExpandedDepartmentIDs] = useState<Set<string>>(() => new Set());
  const selectedDepartment = workspace.adminData.selectedDepartment;

  useEffect(() => {
    if (!workspace.adminData.selectedDepartment && workspace.adminData.departments[0]) {
      workspace.adminData.setSelectedDepartmentID(workspace.adminData.departments[0].departmentID);
    }
  }, [workspace]);

  useEffect(() => {
    setExpandedDepartmentIDs((current) => {
      const next = new Set(current);
      workspace.adminData.departments.forEach((department) => next.add(department.departmentID));
      if (workspace.adminData.selectedDepartment?.departmentID) next.add(workspace.adminData.selectedDepartment.departmentID);
      return next;
    });
  }, [workspace.adminData.departments, workspace.adminData.selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment) {
      setRenameName(selectedDepartment.name);
    }
  }, [selectedDepartment]);

  const departmentWorkbench = useMemo(
    () =>
      deriveDepartmentWorkbench({
        departments: workspace.adminData.departments,
        users: workspace.adminData.adminUsers,
        skills: workspace.adminData.adminSkills,
        selectedDepartmentID: selectedDepartment?.departmentID ?? null,
        expandedDepartmentIDs
      }),
    [expandedDepartmentIDs, selectedDepartment?.departmentID, workspace.adminData.adminSkills, workspace.adminData.adminUsers, workspace.adminData.departments]
  );

  const toggleDepartmentExpanded = (departmentID: string) => {
    setExpandedDepartmentIDs((current) => {
      const next = new Set(current);
      if (next.has(departmentID)) next.delete(departmentID);
      else next.add(departmentID);
      return next;
    });
  };

  return (
    <div className="manage-pane-grid departments-workbench">
      <section className="stage-panel list-panel manage-tree-panel">
        <div className="local-filter-shell">
          <div className="eyebrow">部门树</div>
          <p className="workspace-toolbar-desc">展开/收起真实组织树，选择节点后刷新中间工作区和右侧检查器。</p>
        </div>
        <div className="department-tree-list">
          {departmentWorkbench.visibleRows.length === 0 ? <SectionEmpty title="暂无部门数据" body="保持在线后会加载可管理范围内的部门树。" /> : null}
          {departmentWorkbench.visibleRows.map((row) => {
            const isActive = selectedDepartment?.departmentID === row.department.departmentID;
            return (
              <div className={isActive ? "department-tree-row active" : "department-tree-row"} key={row.department.departmentID} style={{ paddingLeft: `${row.depth * 14}px` }}>
                <button
                  className="tree-toggle"
                  type="button"
                  aria-label={row.expanded ? "收起部门" : "展开部门"}
                  disabled={!row.hasChildren}
                  onClick={() => toggleDepartmentExpanded(row.department.departmentID)}
                >
                  {row.hasChildren ? (row.expanded ? "−" : "+") : "·"}
                </button>
                <button className="department-tree-select" type="button" onClick={() => workspace.adminData.setSelectedDepartmentID(row.department.departmentID)}>
                  <span>
                    <strong>{row.department.name}</strong>
                    <small>{row.department.path}</small>
                  </span>
                  <span className="department-tree-metrics">
                    <small>{row.department.userCount} 人</small>
                    <small>{getDepartmentAdminCount(row.department, workspace.adminData.adminUsers)} 直接管理员</small>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="stage-panel detail-panel department-workspace-panel">
        {!selectedDepartment ? (
          <SectionEmpty title="选择一个部门查看工作区" body="中间区域会展示部门下级、用户、管理员和 Skill 投影。" />
        ) : (
          <>
            <div className="detail-panel-head">
              <div>
                <div className="eyebrow">中心工作区</div>
                <h3>{selectedDepartment.name}</h3>
                <p>{selectedDepartment.path}</p>
              </div>
              <TagPill tone="info">L{selectedDepartment.level}</TagPill>
            </div>
            <div className="definition-grid split compact-metrics">
              <div><dt>范围用户</dt><dd>{departmentWorkbench.scopedUsers.length}</dd></div>
              <div><dt>范围管理员</dt><dd>{departmentWorkbench.scopedAdmins.length}</dd></div>
              <div><dt>范围 Skills</dt><dd>{departmentWorkbench.scopedSkills.length}</dd></div>
              <div><dt>直接子部门</dt><dd>{departmentWorkbench.childDepartments.length}</dd></div>
            </div>
            <div className="detail-block inspector-subsection">
              <h3>直接下级部门</h3>
              <div className="stack-list compact">
                {departmentWorkbench.childDepartments.length === 0 ? <small>暂无下级部门。</small> : null}
                {departmentWorkbench.childDepartments.map((department) => (
                  <button key={department.departmentID} className="micro-row button-row" type="button" onClick={() => workspace.adminData.setSelectedDepartmentID(department.departmentID)}>
                    <strong>{department.name}</strong>
                    <small>{department.userCount} 人 · {department.skillCount} Skills</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="detail-block inspector-subsection">
              <h3>范围管理员</h3>
              <div className="stack-list compact">
                {departmentWorkbench.scopedAdmins.length === 0 ? <small>当前范围暂无管理员账号。</small> : null}
                {departmentWorkbench.scopedAdmins.slice(0, 6).map((user) => (
                  <div className="micro-row" key={user.userID}>
                    <strong>{user.displayName}</strong>
                    <small>{getAdminUserDepartmentPath(user)} · L{user.adminLevel ?? "?"}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-block inspector-subsection">
              <h3>范围 Skill</h3>
              <div className="stack-list compact">
                {departmentWorkbench.scopedSkills.length === 0 ? <small>当前范围暂无 Skill。</small> : null}
                {departmentWorkbench.scopedSkills.slice(0, 6).map((skill) => (
                  <div className="micro-row" key={skill.skillID}>
                    <strong>{skill.displayName}</strong>
                    <small>{manageSkillStatusLabel(skill.status)} · {skill.publisherName}</small>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
      <aside className="detail-panel inspector-panel">
        {!selectedDepartment ? (
          <SectionEmpty title="选择一个部门查看详情" body="右侧会显示部门结构、聚合指标和维护动作。" />
        ) : (
          <>
            <div className="detail-symbol-card manage-symbol-card">
              <InitialBadge label={selectedDepartment.name} large />
            </div>
            <div className="detail-block">
              <div className="inspector-kicker">部门检查器</div>
              <strong>{selectedDepartment.name}</strong>
              <small>{selectedDepartment.path}</small>
            </div>
            <div className="definition-grid split">
              <div><dt>层级</dt><dd>L{selectedDepartment.level}</dd></div>
              <div><dt>状态</dt><dd>{selectedDepartment.status}</dd></div>
              <div><dt>用户数</dt><dd>{selectedDepartment.userCount}</dd></div>
              <div><dt>Skill 数</dt><dd>{selectedDepartment.skillCount}</dd></div>
              <div><dt>直接管理员数</dt><dd>{getDepartmentAdminCount(selectedDepartment, workspace.adminData.adminUsers)}</dd></div>
              <div><dt>范围节点数</dt><dd>{departmentWorkbench.departmentIDsInScope.size}</dd></div>
            </div>
            <div className="detail-block inspector-subsection">
              <h3>新增下级部门</h3>
              <form className="inline-form" onSubmit={(event) => {
                event.preventDefault();
                if (createName.trim().length === 0) return;
                void workspace.adminData.createDepartment(selectedDepartment.departmentID, createName.trim());
                setCreateName("");
              }}>
                <input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="新增下级部门" />
                <button className="btn btn-primary" type="submit">
                  <Plus size={14} />
                  新增
                </button>
              </form>
            </div>
            {selectedDepartment.level > 0 ? (
              <div className="detail-block inspector-subsection">
                <h3>维护部门</h3>
                <form className="inline-form" onSubmit={(event) => {
                  event.preventDefault();
                  if (renameName.trim().length === 0) return;
                  void workspace.adminData.updateDepartment(selectedDepartment.departmentID, renameName.trim());
                }}>
                  <input value={renameName} onChange={(event) => setRenameName(event.target.value)} />
                  <button className="btn" type="submit">保存</button>
                  <button className="btn btn-danger" type="button" onClick={() => void workspace.adminData.deleteDepartment(selectedDepartment.departmentID)}>
                    删除
                  </button>
                </form>
              </div>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}

function ManageUsersPane({ workspace }: { workspace: P1WorkspaceState }) {
  const [selectedUserID, setSelectedUserID] = useState<string | null>(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [userFilters, setUserFilters] = useState<{ query: string; role: AdminUserRoleFilter; status: AdminUserStatusFilter }>({
    query: "",
    role: "all",
    status: "all"
  });
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    displayName: "",
    departmentID: "",
    role: "normal_user" as "normal_user" | "admin",
    adminLevel: "4"
  });
  const [userEdit, setUserEdit] = useState({
    displayName: "",
    departmentID: "",
    role: "normal_user" as "normal_user" | "admin",
    adminLevel: "4"
  });

  const departmentOptions = useMemo(() => flattenDepartments(workspace.adminData.departments), [workspace.adminData.departments]);
  const filteredUsers = useMemo(() => filterAdminUsers(workspace.adminData.adminUsers, userFilters), [userFilters, workspace.adminData.adminUsers]);

  useEffect(() => {
    setSelectedUserID((current) => (filteredUsers.some((user) => user.userID === current) ? current : filteredUsers[0]?.userID ?? null));
  }, [filteredUsers]);

  useEffect(() => {
    setNewUser((current) => ({
      ...current,
      departmentID: current.departmentID || workspace.adminData.selectedDepartment?.departmentID || departmentOptions[0]?.departmentID || ""
    }));
  }, [departmentOptions, workspace.adminData.selectedDepartment]);

  const selectedUser = workspace.adminData.adminUsers.find((user) => user.userID === selectedUserID) ?? null;

  useEffect(() => {
    if (!selectedUser) return;
    setUserEdit({
      displayName: selectedUser.displayName,
      departmentID: selectedUser.departmentID,
      role: selectedUser.role,
      adminLevel: String(selectedUser.adminLevel ?? 4)
    });
  }, [selectedUser]);

  return (
    <div className="manage-pane-grid users-workbench">
      <section className="stage-panel list-panel manage-list-panel">
        <div className="local-filter-shell">
          <label className="search-shell">
            <Search size={16} />
            <input
              aria-label="搜索管理用户"
              type="search"
              value={userFilters.query}
              placeholder="搜索姓名、用户名或部门路径"
              onChange={(event) => setUserFilters((current) => ({ ...current, query: event.target.value }))}
            />
          </label>
          <div className="inline-actions wrap">
            {([
              ["all", "全部角色"],
              ["admin", "管理员"],
              ["normal_user", "普通用户"]
            ] as const).map(([role, label]) => (
              <button
                key={role}
                className={userFilters.role === role ? "btn btn-primary btn-small" : "btn btn-small"}
                type="button"
                onClick={() => setUserFilters((current) => ({ ...current, role }))}
              >
                {label}
              </button>
            ))}
            {([
              ["all", "全部状态"],
              ["active", "正常"],
              ["frozen", "冻结"],
              ["deleted", "删除"]
            ] as const).map(([status, label]) => (
              <button
                key={status}
                className={userFilters.status === status ? "btn btn-primary btn-small" : "btn btn-small"}
                type="button"
                onClick={() => setUserFilters((current) => ({ ...current, status }))}
              >
                {label}
              </button>
            ))}
            <button className="btn btn-small" type="button" onClick={() => setShowCreateUserForm((current) => !current)}>
              <Plus size={14} />
              {showCreateUserForm ? "收起新增" : "新增用户"}
            </button>
          </div>
        </div>
        {showCreateUserForm ? (
          <div className="detail-block inspector-subsection create-user-card">
            <h3>新增用户</h3>
            <form className="form-stack compact" onSubmit={(event) => {
              event.preventDefault();
              if (!newUser.departmentID || !newUser.username.trim() || !newUser.displayName.trim()) return;
              void workspace.adminData.createAdminUser({
                username: newUser.username.trim(),
                password: newUser.password,
                displayName: newUser.displayName.trim(),
                departmentID: newUser.departmentID,
                role: newUser.role,
                adminLevel: newUser.role === "admin" ? Number(newUser.adminLevel) : null
              });
              setShowCreateUserForm(false);
              setNewUser((current) => ({ ...current, username: "", password: "", displayName: "" }));
            }}>
              <label className="field"><span>用户名</span><input value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} /></label>
              <label className="field"><span>显示名</span><input value={newUser.displayName} onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))} /></label>
              <label className="field"><span>初始密码</span><input value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} /></label>
              <label className="field">
                <span>所属部门</span>
                <select value={newUser.departmentID} onChange={(event) => setNewUser((current) => ({ ...current, departmentID: event.target.value }))}>
                  {departmentOptions.map((department) => (
                    <option key={department.departmentID} value={department.departmentID}>{department.path}</option>
                  ))}
                </select>
              </label>
              <SelectField label="角色" value={newUser.role} options={["normal_user", "admin"]} onChange={(value) => setNewUser((current) => ({ ...current, role: value as "normal_user" | "admin" }))} />
              {newUser.role === "admin" ? (
                <label className="field"><span>管理员等级</span><input value={newUser.adminLevel} onChange={(event) => setNewUser((current) => ({ ...current, adminLevel: event.target.value }))} /></label>
              ) : null}
              <button className="btn btn-primary" type="submit">
                <Users size={14} />
                创建用户
              </button>
            </form>
          </div>
        ) : null}
        <div className="stack-list">
          {filteredUsers.length === 0 ? <SectionEmpty title="没有符合条件的用户" body="调整搜索词、角色或状态筛选后再试一次。" /> : null}
          {filteredUsers.map((user) => (
            <button
              key={user.userID}
              className={selectedUser?.userID === user.userID ? "selection-row active" : "selection-row"}
              type="button"
              onClick={() => setSelectedUserID(user.userID)}
            >
              <div className="selection-row-main">
                <InitialBadge label={user.displayName} />
                <span>
                  <strong>{user.displayName}</strong>
                  <small>{getAdminUserDepartmentPath(user)} · {user.username}</small>
                </span>
              </div>
              <span className="selection-row-meta">
                <TagPill tone={user.status === "active" ? "success" : user.status === "frozen" ? "warning" : "neutral"}>{userStatusLabel(user.status)}</TagPill>
                <small>{user.role === "admin" ? `管理员 L${user.adminLevel ?? "?"}` : "普通用户"}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <aside className="detail-panel inspector-panel governance-panel">
        {!selectedUser ? (
          <SectionEmpty title="选择一个用户进行治理" body="右侧检查器专注账号状态、部门、登录时间和治理动作；新增用户在左侧展开。" />
        ) : (
          <>
            <div className="detail-symbol-card manage-symbol-card">
              <InitialBadge label={selectedUser.displayName} large />
            </div>
            <div className="detail-block">
              <div className="inspector-kicker">账号治理</div>
              <strong>{selectedUser.displayName}</strong>
              <small>{selectedUser.username} · {selectedUser.userID}</small>
            </div>
            <div className="pill-row">
              <TagPill tone={selectedUser.status === "active" ? "success" : selectedUser.status === "frozen" ? "warning" : "neutral"}>{userStatusLabel(selectedUser.status)}</TagPill>
              <TagPill tone="info">{selectedUser.role === "admin" ? `管理员 L${selectedUser.adminLevel ?? "?"}` : "普通用户"}</TagPill>
            </div>
            <div className="definition-grid split">
              <div><dt>部门路径</dt><dd>{getAdminUserDepartmentPath(selectedUser)}</dd></div>
              <div><dt>最近登录</dt><dd>{formatDate(getAdminUserLastLoginAt(selectedUser))}</dd></div>
              <div><dt>发布 Skill</dt><dd>{selectedUser.publishedSkillCount}</dd></div>
              <div><dt>获星</dt><dd>{selectedUser.starCount}</dd></div>
            </div>
            <div className="detail-block inspector-subsection">
              <h3>账号资料</h3>
              <form className="form-stack compact" onSubmit={(event) => {
                event.preventDefault();
                if (!userEdit.displayName.trim() || !userEdit.departmentID) return;
                void workspace.adminData.updateAdminUser(selectedUser.userID, {
                  displayName: userEdit.displayName.trim(),
                  departmentID: userEdit.departmentID,
                  role: userEdit.role,
                  adminLevel: userEdit.role === "admin" ? Number(userEdit.adminLevel) : null
                });
              }}>
                <label className="field"><span>显示名</span><input value={userEdit.displayName} onChange={(event) => setUserEdit((current) => ({ ...current, displayName: event.target.value }))} /></label>
                <label className="field">
                  <span>所属部门</span>
                  <select value={userEdit.departmentID} onChange={(event) => setUserEdit((current) => ({ ...current, departmentID: event.target.value }))}>
                    {departmentOptions.map((department) => (
                      <option key={department.departmentID} value={department.departmentID}>{department.path}</option>
                    ))}
                  </select>
                </label>
                <SelectField label="角色" value={userEdit.role} options={["normal_user", "admin"]} onChange={(value) => setUserEdit((current) => ({ ...current, role: value as "normal_user" | "admin" }))} />
                {userEdit.role === "admin" ? (
                  <label className="field"><span>管理员等级</span><input value={userEdit.adminLevel} onChange={(event) => setUserEdit((current) => ({ ...current, adminLevel: event.target.value }))} /></label>
                ) : null}
                <button className="btn" type="submit">保存资料</button>
              </form>
            </div>
            <div className="inline-actions wrap">
              <button className="btn" type="button" onClick={() => void workspace.adminData.updateAdminUser(selectedUser.userID, { role: "normal_user", adminLevel: null })}>
                设为普通用户
              </button>
              <button className="btn" type="button" onClick={() => void workspace.adminData.updateAdminUser(selectedUser.userID, { role: "admin", adminLevel: selectedUser.adminLevel ?? 3 })}>
                设为管理员
              </button>
              {selectedUser.status === "frozen" ? (
                <button className="btn" type="button" onClick={() => void workspace.adminData.unfreezeAdminUser(selectedUser.userID)}>
                  解冻
                </button>
              ) : (
                <button className="btn" type="button" onClick={() => void workspace.adminData.freezeAdminUser(selectedUser.userID)}>
                  冻结
                </button>
              )}
              <button className="btn btn-danger" type="button" onClick={() => void workspace.adminData.deleteAdminUser(selectedUser.userID)}>
                删除
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export function ManageSection({ workspace, ui }: SectionProps) {
  if (!workspace.isAdminConnected) {
    return (
      <div className="stage-page workspace-page">
        <AuthGateCard title="管理入口仅对在线管理员开放" body="登录并保持连接后，可统一处理审核、Skills、部门和用户。" onLogin={() => workspace.requireAuth("review")} />
      </div>
    );
  }

  const headerMap: Record<ManagePane, { title: string; description: string; action?: React.ReactNode }> = {
    reviews: {
      title: "审核",
      description: "统一查看待审核、审核中和已审核单据，并在同一工作区完成处理。"
    },
    skills: {
      title: "Skills",
      description: "查看 Skill 状态、热度与上下架动作。"
    },
    departments: {
      title: "部门",
      description: "维护部门结构、层级和可管理范围。"
    },
    users: {
      title: "用户",
      description: "创建账号、调整角色和管理冻结状态。"
    }
  };

  const header = headerMap[ui.managePane];

  return (
    <div className="stage-page workspace-page">
      <div className="workspace-layout">
        <ManageSidebar ui={ui} workspace={workspace} />
        <div className="workspace-main">
          <WorkspaceToolbar icon={<ShieldCheck size={16} />} title={header.title} description={header.description} actions={header.action} />
          {ui.managePane === "reviews" ? <ManageReviewsPane workspace={workspace} ui={ui} /> : null}
          {ui.managePane === "skills" ? <ManageSkillsPane workspace={workspace} ui={ui} /> : null}
          {ui.managePane === "departments" ? <ManageDepartmentsPane workspace={workspace} /> : null}
          {ui.managePane === "users" ? <ManageUsersPane workspace={workspace} /> : null}
        </div>
      </div>
    </div>
  );
}
