import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BellDot,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Command,
  Download,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SquareLibrary,
  Star,
  Store,
  TerminalSquare,
  TestTube2,
  ToolCase,
  Trash2,
  UserPlus,
  Users,
  WifiOff,
  Workflow
} from "lucide-react";
import type { MarketFilters, PageID, ReviewItem, SkillSummary } from "./domain/p1";
import { useP1Workspace } from "./state/useP1Workspace";

const pageMeta: Record<PageID, { label: string; icon: ReactNode }> = {
  home: { label: "工作台", icon: <LayoutDashboard size={18} /> },
  market: { label: "市场", icon: <Store size={18} /> },
  my_installed: { label: "已安装", icon: <SquareLibrary size={18} /> },
  review: { label: "审核", icon: <ClipboardList size={18} /> },
  manage: { label: "管理", icon: <ShieldCheck size={18} /> },
  tools: { label: "工具", icon: <ToolCase size={18} /> },
  projects: { label: "项目", icon: <FolderOpen size={18} /> },
  notifications: { label: "通知", icon: <BellDot size={18} /> },
  settings: { label: "设置", icon: <SlidersHorizontal size={18} /> }
};

function categoryIcon(skill: SkillSummary): ReactNode {
  if (skill.category.includes("治理") || skill.category.includes("安全")) return <ShieldCheck size={20} />;
  if (skill.category.includes("文档")) return <BookOpenCheck size={20} />;
  if (skill.category.includes("测试")) return <TestTube2 size={20} />;
  if (skill.category.includes("工具")) return <Workflow size={20} />;
  if (skill.category.includes("CLI")) return <TerminalSquare size={20} />;
  return <Sparkles size={20} />;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(skill: SkillSummary): string {
  if (skill.isScopeRestricted) return "权限收缩";
  switch (skill.installState) {
    case "not_installed":
      return "未安装";
    case "installed":
      return "已安装";
    case "enabled":
      return "已启用";
    case "update_available":
      return "有更新";
    case "blocked":
      return "不可安装";
  }
}

function riskLabel(skill: SkillSummary): string {
  return { low: "低", medium: "中", high: "高", unknown: "未知" }[skill.riskLevel];
}

function roleLabel(user: ReturnType<typeof useP1Workspace>["currentUser"]): string {
  if (user.role === "guest") return "本地模式";
  if (user.role !== "admin") return "普通用户";
  return `管理员 L${user.adminLevel ?? "?"}`;
}

function LoginModal({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const [form, setForm] = useState({
    serverURL: "http://127.0.0.1:3000",
    username: "demo",
    password: "demo123"
  });

  useEffect(() => {
    if (!workspace.loginModalOpen) return;
    setForm((current) => ({
      ...current,
      serverURL: workspace.loggedIn ? current.serverURL : workspace.currentUser.userID === "guest" ? "http://127.0.0.1:3000" : current.serverURL
    }));
  }, [workspace.currentUser.userID, workspace.loggedIn, workspace.loginModalOpen]);

  if (!workspace.loginModalOpen) return null;

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void workspace.login(form);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => workspace.setLoginModalOpen(false)}>
      <section className="modal-card login-modal" role="dialog" aria-modal="true" aria-label="登录同步企业服务" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">连接企业服务</p>
            <h2>登录后解锁市场、通知和管理员入口</h2>
          </div>
          <button className="ghost" onClick={() => workspace.setLoginModalOpen(false)}>关闭</button>
        </div>
        <p className="muted">本机已安装 Skill、工具和项目配置会继续保留。</p>
        <form className="login-form" onSubmit={submit}>
          <label>
            服务地址
            <input name="serverURL" value={form.serverURL} onChange={updateField} />
          </label>
          <label>
            用户名
            <input name="username" value={form.username} onChange={updateField} />
          </label>
          <label>
            密码
            <input name="password" type="password" value={form.password} onChange={updateField} />
          </label>
          {workspace.authError ? <div className="alert danger">{workspace.authError}</div> : null}
          <div className="button-row">
            <button className="primary" type="submit">登录并同步</button>
            <button type="button" onClick={() => workspace.setLoginModalOpen(false)}>稍后再说</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AuthGateCard({ title, body, onLogin }: { title: string; body: string; onLogin: () => void }) {
  return (
    <section className="auth-gate card">
      <p className="eyebrow">需要登录</p>
      <h1>{title}</h1>
      <p>{body}</p>
      <div className="hero-actions">
        <button className="primary" onClick={onLogin}>登录同步</button>
      </div>
    </section>
  );
}

function Shell({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const connection = workspace.bootstrap.connection.status;
  const navItems = workspace.visibleNavigation;
  const connectionLabel =
    workspace.authState === "guest"
      ? "本地模式"
      : connection === "connected"
        ? "已连接"
        : connection === "connecting"
          ? "正在连接"
          : connection === "offline"
            ? "离线模式"
            : "连接失败";

  function globalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("global-search") ?? "");
    workspace.setFilters((current) => ({ ...current, query }));
    if (workspace.loggedIn) {
      workspace.openPage("market");
      return;
    }
    workspace.requireAuth("market");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark compact"><Command size={18} /></div>
          <div>
            <strong>Agent Hub</strong>
            <span>Skill Workspace</span>
          </div>
        </div>
        <nav>
          {navItems.map((page) => (
            <button key={page} className={workspace.activePage === page ? "nav-active" : ""} onClick={() => workspace.openPage(page)}>
              {pageMeta[page].icon}
              <span>{pageMeta[page].label}</span>
              {page === "notifications" && workspace.bootstrap.counts.unreadNotificationCount > 0 ? <b>{workspace.bootstrap.counts.unreadNotificationCount}</b> : null}
            </button>
          ))}
        </nav>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <form className="global-search" onSubmit={globalSearch}>
            <Search size={16} />
            <input name="global-search" placeholder={workspace.loggedIn ? "搜索 Skill 名称、标签、作者或 skillID" : "登录后搜索企业 Skill"} />
          </form>
          <div className={`connection ${connection}`}>
            {connection === "connected" ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
            {connectionLabel}
          </div>
          <button className="ghost" onClick={() => void workspace.refreshBootstrap()}>
            <RefreshCw size={16} />
            刷新
          </button>
          <div className="account-chip">
            <div>
              <strong>{workspace.currentUser.displayName}</strong>
              <span>{roleLabel(workspace.currentUser)}</span>
            </div>
            {workspace.loggedIn ? (
              <button className="ghost" onClick={() => void workspace.logout()}>
                <LogOut size={16} />
                退出
              </button>
            ) : (
              <button className="primary" onClick={() => workspace.requireAuth(null)}>
                登录
              </button>
            )}
          </div>
        </header>
        <main className="content">
          {workspace.activePage === "home" ? <HomePage workspace={workspace} /> : null}
          {workspace.activePage === "market" ? <MarketPage workspace={workspace} /> : null}
          {workspace.activePage === "my_installed" ? <MyInstalledPage workspace={workspace} /> : null}
          {workspace.activePage === "review" ? <ReviewPage workspace={workspace} /> : null}
          {workspace.activePage === "manage" ? <ManagePage workspace={workspace} /> : null}
          {workspace.activePage === "tools" ? <ToolsPage workspace={workspace} /> : null}
          {workspace.activePage === "projects" ? <ProjectsPage workspace={workspace} /> : null}
          {workspace.activePage === "notifications" ? <NotificationsPage workspace={workspace} /> : null}
          {workspace.activePage === "settings" ? <SettingsPage workspace={workspace} /> : null}
        </main>
      </div>
      {workspace.progress ? <OperationToast progress={workspace.progress} /> : null}
      <LoginModal workspace={workspace} />
    </div>
  );
}

function HomePage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const sourceSkills = workspace.loggedIn ? workspace.skills : workspace.installedSkills;
  const recommended = sourceSkills.slice(0, 3);
  const recent = [...sourceSkills].sort((left, right) => right.currentVersionUpdatedAt.localeCompare(left.currentVersionUpdatedAt)).slice(0, 3);
  const summaryNotifications = workspace.notifications.slice(0, 3);

  return (
    <section className="page-grid">
      <div className="hero card">
        <p className="eyebrow">服务状态</p>
        <h1>{workspace.loggedIn ? "工作台已就绪" : "先从本地工作台开始"}</h1>
        <p>
          {workspace.loggedIn
            ? workspace.bootstrap.connection.lastError ?? "市场、安装状态、通知和管理员权限已同步；本地 Skill 不会被自动覆盖。"
            : "当前先展示本机已安装 Skill、工具和项目配置。登录后可继续访问市场、通知和管理员入口。"}
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={() => (workspace.loggedIn ? workspace.openPage("market") : workspace.requireAuth("market"))}>
            进入市场
          </button>
          <button onClick={() => workspace.openPage("my_installed")}>查看已安装</button>
          <button onClick={() => workspace.openPage("tools")}>工具管理</button>
        </div>
      </div>
      <MetricCards workspace={workspace} />
      {!workspace.loggedIn ? (
        <div className="card">
          <h2>登录后可用</h2>
          <div className="tag-row">
            <span>市场搜索</span>
            <span>远端通知</span>
            <span>Star</span>
            <span>管理员页签</span>
          </div>
          <p>点击市场、通知或管理员入口时，会自动弹出登录框。</p>
        </div>
      ) : null}
      <ListCard title={workspace.loggedIn ? "最近更新" : "最近本机变更"} skills={recent} onOpen={workspace.openSkill} />
      <ListCard title={workspace.loggedIn ? "热门推荐" : "已安装 Skill"} skills={recommended} onOpen={workspace.openSkill} />
      <div className="card">
        <h2>{workspace.loggedIn ? "通知摘要" : "本机提醒"}</h2>
        {summaryNotifications.length === 0 ? <p className="muted">暂时没有消息。</p> : null}
        {summaryNotifications.map((notification) => (
          <button className="list-row" key={notification.notificationID} onClick={() => workspace.openPage(notification.targetPage)}>
            <span>{notification.title}</span>
            <small>{formatDate(notification.occurredAt)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function MetricCards({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const metrics = [
    ["本机已安装", workspace.bootstrap.counts.installedCount],
    ["已启用目标", workspace.bootstrap.counts.enabledCount],
    ["待更新", workspace.bootstrap.counts.updateAvailableCount],
    ["未读通知", workspace.bootstrap.counts.unreadNotificationCount]
  ] as const;
  return (
    <div className="metrics">
      {metrics.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ListCard({ title, skills, onOpen }: { title: string; skills: SkillSummary[]; onOpen: (skillID: string) => void }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {skills.length === 0 ? <p className="muted">这里会在有本机或远端数据后更新。</p> : null}
      {skills.map((skill) => (
        <button key={skill.skillID} className="list-row" onClick={() => onOpen(skill.skillID)}>
          <span>{skill.displayName}</span>
          <small>{skill.version} · {skill.authorDepartment}</small>
        </button>
      ))}
    </div>
  );
}

function MarketPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const connection = workspace.bootstrap.connection.status;
  const offline = connection === "offline" || connection === "failed";

  if (!workspace.loggedIn) {
    return <AuthGateCard title="市场需要登录后同步" body="登录后可搜索企业 Skill、查看完整详情、安装更新并收取服务端通知。" onLogin={() => workspace.requireAuth("market")} />;
  }

  return (
    <section className="market-layout">
      <div className="card filters">
        <h2>市场筛选</h2>
        {offline ? <div className="alert warning">离线模式下无法搜索市场，安装和更新已禁用。</div> : null}
        <input value={workspace.filters.query} placeholder="搜索 Skill" onChange={(event) => workspace.setFilters((current) => ({ ...current, query: event.target.value }))} disabled={offline} />
        <SelectFilter label="部门" value={workspace.filters.department} options={["all", ...workspace.departments]} onChange={(value) => workspace.setFilters((current) => ({ ...current, department: value }))} />
        <SelectFilter label="工具" value={workspace.filters.compatibleTool} options={["all", ...workspace.compatibleTools]} onChange={(value) => workspace.setFilters((current) => ({ ...current, compatibleTool: value }))} />
        <SelectFilter label="安装" value={workspace.filters.installed} options={["all", "installed", "not_installed"]} onChange={(value) => workspace.setFilters((current) => ({ ...current, installed: value as MarketFilters["installed"] }))} />
        <SelectFilter label="启用" value={workspace.filters.enabled} options={["all", "enabled", "not_enabled"]} onChange={(value) => workspace.setFilters((current) => ({ ...current, enabled: value as MarketFilters["enabled"] }))} />
        <SelectFilter label="权限" value={workspace.filters.accessScope} options={["include_public", "authorized_only"]} onChange={(value) => workspace.setFilters((current) => ({ ...current, accessScope: value as MarketFilters["accessScope"] }))} />
        <SelectFilter label="风险" value={workspace.filters.riskLevel} options={["all", "low", "medium", "high", "unknown"]} onChange={(value) => workspace.setFilters((current) => ({ ...current, riskLevel: value as MarketFilters["riskLevel"] }))} />
        <SelectFilter label="排序" value={workspace.filters.sort} options={["composite", "latest_published", "recently_updated", "download_count", "star_count", "relevance"]} onChange={(value) => workspace.setFilters((current) => ({ ...current, sort: value as MarketFilters["sort"] }))} />
      </div>
      <div className="market-results">
        <div className="section-heading">
          <h1>Skill 市场</h1>
          <span>{workspace.marketSkills.length} 个结果</span>
        </div>
        {workspace.marketSkills.length === 0 ? <div className="card empty">没有找到匹配的 Skill。</div> : null}
        <div className="skill-grid">
          {workspace.marketSkills.map((skill) => (
            <SkillCard key={skill.skillID} skill={skill} offline={offline} workspace={workspace} />
          ))}
        </div>
      </div>
      {workspace.selectedSkill ? <SkillDetail skill={workspace.selectedSkill} workspace={workspace} offline={offline} /> : null}
    </section>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function SkillCard({ skill, offline, workspace }: { skill: SkillSummary; offline: boolean; workspace: ReturnType<typeof useP1Workspace> }) {
  return (
    <article className={`skill-card ${skill.installState}`} onClick={() => workspace.selectSkill(skill.skillID)}>
      <div className="card-topline">
        <span className="skill-icon">{categoryIcon(skill)}</span>
        <span className="badge">{statusLabel(skill)}</span>
        <button className="star" onClick={(event) => { event.stopPropagation(); void workspace.toggleStar(skill.skillID); }}>
          <Star size={15} fill={skill.starred ? "currentColor" : "none"} /> {skill.starCount}
        </button>
      </div>
      <h3>{skill.displayName}</h3>
      <code>{skill.skillID}</code>
      <p>{skill.description}</p>
      <div className="tag-row">
        {skill.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <small>{skill.authorName} / {skill.authorDepartment} · v{skill.version} · 风险{riskLabel(skill)}</small>
      <SkillActions skill={skill} offline={offline} workspace={workspace} compact />
    </article>
  );
}

function SkillDetail({ skill, offline, workspace }: { skill: SkillSummary; offline: boolean; workspace: ReturnType<typeof useP1Workspace> }) {
  const isSummaryOnly = skill.detailAccess === "summary";
  return (
    <aside className="detail-panel card">
      <div className="card-topline">
        <span className="skill-icon">{categoryIcon(skill)}</span>
        <span className="badge">{statusLabel(skill)}</span>
        <button className="star" onClick={() => void workspace.toggleStar(skill.skillID)}><Star size={15} fill={skill.starred ? "currentColor" : "none"} /> {skill.starCount}</button>
      </div>
      <h2>{skill.displayName}</h2>
      <p className="muted">{skill.skillID} · {skill.authorName} · {skill.authorDepartment}</p>
      {isSummaryOnly ? (
        <div className="alert warning"><ShieldAlert size={16} /> 该 Skill 暂未向你开放详情；不会展示 README、安全摘要或包信息。</div>
      ) : (
        <>
          <h3>使用说明</h3>
          <p>{skill.readme}</p>
          <h3>安全摘要</h3>
          <p>{skill.reviewSummary}</p>
          <h3>本机状态</h3>
          <p>本地版本：{skill.localVersion ?? "未安装"}；市场版本：{skill.version}；最近启用：{formatDate(skill.lastEnabledAt)}</p>
        </>
      )}
      <SkillActions skill={skill} offline={offline} workspace={workspace} />
      <h3>启用位置</h3>
      {skill.enabledTargets.length === 0 ? <p className="muted">暂无启用位置。</p> : null}
      {skill.enabledTargets.map((target) => (
        <div className="target-row" key={`${target.targetType}:${target.targetID}`}>
          <div>
            <strong>{target.targetName}</strong>
            <small>{target.targetPath}</small>
            <small>{target.requestedMode} → {target.resolvedMode}{target.fallbackReason ? ` · ${target.fallbackReason}` : ""}</small>
          </div>
          <button onClick={() => void workspace.disableSkill(skill.skillID, target.targetID)}>停用</button>
        </div>
      ))}
    </aside>
  );
}

function SkillActions({ skill, offline, workspace, compact = false }: { skill: SkillSummary; offline: boolean; workspace: ReturnType<typeof useP1Workspace>; compact?: boolean }) {
  function updateWithConfirm() {
    if (skill.hasLocalHashDrift && !window.confirm("本地内容已变更，本次更新将覆盖 Central Store 中的本地内容。继续？")) return;
    void workspace.installOrUpdate(skill.skillID, skill.localVersion ? "update" : "install");
  }

  function uninstallWithConfirm() {
    if (!window.confirm(`卸载会移除 Central Store 和 ${skill.enabledTargets.length} 个托管目标。继续？`)) return;
    void workspace.uninstallSkill(skill.skillID);
  }

  const canInstallOrUpdate = skill.canInstall && skill.detailAccess === "full" && !skill.isScopeRestricted;
  return (
    <div className={compact ? "actions compact" : "actions"}>
      {!skill.localVersion ? <button className="primary" disabled={offline || !canInstallOrUpdate} onClick={updateWithConfirm}><Download size={15} />安装</button> : null}
      {skill.localVersion && skill.installState === "update_available" ? <button className="primary" disabled={offline || !skill.canUpdate} onClick={updateWithConfirm}><RefreshCw size={15} />更新</button> : null}
      {skill.localVersion ? <button disabled={skill.isScopeRestricted} onClick={() => void workspace.enableSkill(skill.skillID, "tool", "codex")}>启用到 Codex</button> : null}
      {skill.localVersion ? <button disabled>项目启用待后续</button> : null}
      {skill.localVersion ? <button className="danger-button" onClick={uninstallWithConfirm}>卸载</button> : null}
      {!canInstallOrUpdate && !skill.localVersion ? <span className="muted">{skill.cannotInstallReason ?? "不可安装"}</span> : null}
    </div>
  );
}

function MyInstalledPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  return (
    <section>
      <div className="section-heading"><h1>已安装 Skill</h1><span>保留本机状态</span></div>
      <div className="table-card card">
        {workspace.installedSkills.length === 0 ? <p className="muted">当前还没有本机已安装 Skill。</p> : null}
        {workspace.installedSkills.map((skill) => (
          <div className="installed-row" key={skill.skillID}>
            <div>
              <h3>{skill.displayName}</h3>
              <p>{skill.skillID} · 本地 {skill.localVersion} · 市场 {skill.version}</p>
              {skill.isScopeRestricted ? <div className="alert warning">可继续使用当前版本，但不可更新或新增启用位置。</div> : null}
            </div>
            <div><strong>{statusLabel(skill)}</strong><small>已启用目标：{skill.enabledTargets.length}</small></div>
            <SkillActions skill={skill} offline={workspace.bootstrap.connection.status !== "connected"} workspace={workspace} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const [filter, setFilter] = useState<"all" | ReviewItem["reviewStatus"]>("all");
  const items = workspace.adminData.reviews.filter((review) => filter === "all" || review.reviewStatus === filter);

  if (!workspace.isAdminConnected) {
    return <AuthGateCard title="审核页仅对在线管理员开放" body="登录并与服务端保持连接后，可以查看待审核、审核中和已审核列表。" onLogin={() => workspace.requireAuth("review")} />;
  }

  return (
    <section className="admin-layout">
      <div className="card admin-column">
        <div className="section-heading">
          <h1>审核</h1>
          <span>当前只读</span>
        </div>
        <div className="segmented-control">
          {(["all", "pending", "in_review", "reviewed"] as const).map((status) => (
            <button key={status} className={filter === status ? "segment-active" : ""} onClick={() => setFilter(status)}>
              {status === "all" ? "全部" : status === "pending" ? "待审核" : status === "in_review" ? "审核中" : "已审核"}
            </button>
          ))}
        </div>
        <div className="alert info">本轮只提供列表与详情查看，不提供锁单、同意、拒绝或退回。</div>
        <div className="admin-list">
          {items.map((review) => (
            <button key={review.reviewID} className={`admin-list-row ${workspace.adminData.selectedReviewID === review.reviewID ? "selected" : ""}`} onClick={() => workspace.adminData.setSelectedReviewID(review.reviewID)}>
              <div>
                <strong>{review.skillDisplayName}</strong>
                <small>{review.submitterDepartmentName} · {review.submitterName}</small>
              </div>
              <div>
                <span className="badge">{review.reviewStatus === "pending" ? "待审核" : review.reviewStatus === "in_review" ? "审核中" : "已审核"}</span>
                <small>{formatDate(review.updatedAt)}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="card admin-detail">
        {!workspace.adminData.selectedReview ? <p className="muted">选择一条审核单查看详情。</p> : (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">审核详情</p>
                <h2>{workspace.adminData.selectedReview.skillDisplayName}</h2>
              </div>
              <span className="badge">{workspace.adminData.selectedReview.reviewType}</span>
            </div>
            <p>{workspace.adminData.selectedReview.description}</p>
            <div className="detail-block-grid">
              <div className="detail-block">
                <h3>提交信息</h3>
                <small>提交人：{workspace.adminData.selectedReview.submitterName}</small>
                <small>部门：{workspace.adminData.selectedReview.submitterDepartmentName}</small>
                <small>提交时间：{formatDate(workspace.adminData.selectedReview.submittedAt)}</small>
              </div>
              <div className="detail-block">
                <h3>当前状态</h3>
                <small>阶段：{workspace.adminData.selectedReview.reviewStatus}</small>
                <small>风险：{workspace.adminData.selectedReview.riskLevel}</small>
                <small>当前审核人：{workspace.adminData.selectedReview.currentReviewerName ?? "未锁定"}</small>
              </div>
            </div>
            {workspace.adminData.selectedReview.reviewSummary ? (
              <div className="detail-block">
                <h3>审核摘要</h3>
                <p>{workspace.adminData.selectedReview.reviewSummary}</p>
              </div>
            ) : null}
            <div className="detail-block">
              <h3>流转记录</h3>
              <div className="history-list">
                {workspace.adminData.selectedReview.history.map((history) => (
                  <div className="history-row" key={history.historyID}>
                    <strong>{history.action}</strong>
                    <span>{history.actorName}</span>
                    <small>{history.comment ?? "无补充说明"} · {formatDate(history.createdAt)}</small>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ManagePage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const [createDepartmentName, setCreateDepartmentName] = useState("");
  const [renameDepartmentName, setRenameDepartmentName] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "demo123",
    displayName: "",
    departmentID: "",
    role: "normal_user" as "normal_user" | "admin",
    adminLevel: "4"
  });
  const [selectedUserID, setSelectedUserID] = useState<string | null>(null);

  const selectedUser = workspace.adminData.adminUsers.find((user) => user.userID === selectedUserID) ?? workspace.adminData.adminUsers[0] ?? null;
  const selectedSkill = workspace.adminData.adminSkills[0] ?? null;

  useEffect(() => {
    setSelectedUserID((current) => (workspace.adminData.adminUsers.some((user) => user.userID === current) ? current : workspace.adminData.adminUsers[0]?.userID ?? null));
  }, [workspace.adminData.adminUsers]);

  useEffect(() => {
    if (!workspace.adminData.selectedDepartment) return;
    setRenameDepartmentName(workspace.adminData.selectedDepartment.name);
    setNewUser((current) => ({
      ...current,
      departmentID: current.departmentID || workspace.adminData.selectedDepartment!.departmentID
    }));
  }, [workspace.adminData.selectedDepartment]);

  if (!workspace.isAdminConnected) {
    return <AuthGateCard title="管理页仅对在线管理员开放" body="登录并保持连接后，可管理部门树、用户与 Skill 状态。" onLogin={() => workspace.requireAuth("manage")} />;
  }

  const selectedDepartment = workspace.adminData.selectedDepartment;

  function submitDepartmentCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDepartment || createDepartmentName.trim().length === 0) return;
    void workspace.adminData.createDepartment(selectedDepartment.departmentID, createDepartmentName.trim());
    setCreateDepartmentName("");
  }

  function submitDepartmentRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDepartment || renameDepartmentName.trim().length === 0) return;
    void workspace.adminData.updateDepartment(selectedDepartment.departmentID, renameDepartmentName.trim());
  }

  function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newUser.departmentID) return;
    void workspace.adminData.createAdminUser({
      username: newUser.username.trim(),
      password: newUser.password,
      displayName: newUser.displayName.trim(),
      departmentID: newUser.departmentID,
      role: newUser.role,
      adminLevel: newUser.role === "admin" ? Number(newUser.adminLevel) : null
    });
    setNewUser((current) => ({ ...current, username: "", displayName: "" }));
  }

  return (
    <section>
      <div className="section-heading">
        <h1>管理</h1>
        <div className="segmented-control">
          <button className={workspace.adminData.manageSection === "departments" ? "segment-active" : ""} onClick={() => workspace.adminData.setManageSection("departments")}><Building2 size={16} />部门</button>
          <button className={workspace.adminData.manageSection === "users" ? "segment-active" : ""} onClick={() => workspace.adminData.setManageSection("users")}><Users size={16} />用户</button>
          <button className={workspace.adminData.manageSection === "skills" ? "segment-active" : ""} onClick={() => workspace.adminData.setManageSection("skills")}><Archive size={16} />Skill</button>
        </div>
      </div>

      {workspace.adminData.manageSection === "departments" ? (
        <section className="admin-layout">
          <div className="card admin-column">
            <h2>部门树</h2>
            <DepartmentTree nodes={workspace.adminData.departments} selectedDepartmentID={selectedDepartment?.departmentID ?? null} onSelect={workspace.adminData.setSelectedDepartmentID} />
          </div>
          <div className="card admin-detail">
            {!selectedDepartment ? <p className="muted">选择部门查看详情。</p> : (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">部门详情</p>
                    <h2>{selectedDepartment.name}</h2>
                  </div>
                  <span className="badge">L{selectedDepartment.level}</span>
                </div>
                <div className="detail-block-grid">
                  <div className="detail-block">
                    <h3>基本信息</h3>
                    <small>路径：{selectedDepartment.path}</small>
                    <small>用户数：{selectedDepartment.userCount}</small>
                    <small>Skill 数：{selectedDepartment.skillCount}</small>
                  </div>
                  <div className="detail-block">
                    <h3>新增下级部门</h3>
                    <form className="inline-form" onSubmit={submitDepartmentCreate}>
                      <input value={createDepartmentName} placeholder="例如：AI 平台组" onChange={(event) => setCreateDepartmentName(event.target.value)} />
                      <button className="primary" type="submit"><Plus size={15} />新增</button>
                    </form>
                  </div>
                </div>
                {selectedDepartment.level > 0 ? (
                  <form className="inline-form detail-block" onSubmit={submitDepartmentRename}>
                    <div className="form-copy">
                      <h3>重命名部门</h3>
                      <small>会同步更新该部门及其后代路径。</small>
                    </div>
                    <input value={renameDepartmentName} onChange={(event) => setRenameDepartmentName(event.target.value)} />
                    <button className="primary" type="submit">保存</button>
                    <button type="button" className="danger-button" onClick={() => {
                      if (window.confirm(`删除 ${selectedDepartment.name} 需要该部门没有用户、Skill 和下级部门。继续？`)) {
                        void workspace.adminData.deleteDepartment(selectedDepartment.departmentID);
                      }
                    }}>
                      <Trash2 size={15} />
                      删除
                    </button>
                  </form>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

      {workspace.adminData.manageSection === "users" ? (
        <section className="admin-layout">
          <div className="card admin-column">
            <h2>用户列表</h2>
            <div className="admin-list">
              {workspace.adminData.adminUsers.map((user) => (
                <button key={user.userID} className={`admin-list-row ${selectedUser?.userID === user.userID ? "selected" : ""}`} onClick={() => setSelectedUserID(user.userID)}>
                  <div>
                    <strong>{user.displayName}</strong>
                    <small>{user.departmentName} · {user.username}</small>
                  </div>
                  <div>
                    <span className="badge">{user.role === "admin" ? `管理员 L${user.adminLevel}` : "普通用户"}</span>
                    <small>{user.status}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="card admin-detail">
            <div className="detail-block-grid">
              <form className="detail-block form-stack" onSubmit={submitCreateUser}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">新增用户</p>
                    <h2>账号开通</h2>
                  </div>
                  <UserPlus size={18} />
                </div>
                <label>
                  用户名
                  <input value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} />
                </label>
                <label>
                  显示名
                  <input value={newUser.displayName} onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))} />
                </label>
                <label>
                  初始密码
                  <input value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} />
                </label>
                <label>
                  所属部门
                  <select value={newUser.departmentID} onChange={(event) => setNewUser((current) => ({ ...current, departmentID: event.target.value }))}>
                    {flattenDepartments(workspace.adminData.departments).map((department) => (
                      <option key={department.departmentID} value={department.departmentID}>{department.path}</option>
                    ))}
                  </select>
                </label>
                <label>
                  角色
                  <select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as "normal_user" | "admin" }))}>
                    <option value="normal_user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </label>
                {newUser.role === "admin" ? (
                  <label>
                    管理员等级
                    <input value={newUser.adminLevel} onChange={(event) => setNewUser((current) => ({ ...current, adminLevel: event.target.value }))} />
                  </label>
                ) : null}
                <button className="primary" type="submit">创建用户</button>
              </form>
              {!selectedUser ? <div className="detail-block"><p className="muted">选择用户查看详情与操作。</p></div> : (
                <div className="detail-block form-stack">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">用户详情</p>
                      <h2>{selectedUser.displayName}</h2>
                    </div>
                    <span className="badge">{selectedUser.role === "admin" ? `管理员 L${selectedUser.adminLevel}` : "普通用户"}</span>
                  </div>
                  <small>用户名：{selectedUser.username}</small>
                  <small>部门：{selectedUser.departmentName}</small>
                  <small>状态：{selectedUser.status}</small>
                  <small>已发布 Skill：{selectedUser.publishedSkillCount}</small>
                  <small>Star 数：{selectedUser.starCount}</small>
                  <div className="button-row">
                    <button onClick={() => void workspace.adminData.updateAdminUser(selectedUser.userID, { role: "normal_user", adminLevel: null })}>设为普通用户</button>
                    <button onClick={() => void workspace.adminData.updateAdminUser(selectedUser.userID, { role: "admin", adminLevel: (selectedUser.adminLevel ?? 3) + 1 })}>提升为下级管理员</button>
                    {selectedUser.status === "frozen" ? (
                      <button onClick={() => void workspace.adminData.unfreezeAdminUser(selectedUser.userID)}>解冻</button>
                    ) : (
                      <button onClick={() => void workspace.adminData.freezeAdminUser(selectedUser.userID)}>冻结</button>
                    )}
                    <button className="danger-button" onClick={() => {
                      if (window.confirm(`确认删除用户 ${selectedUser.displayName} 吗？`)) {
                        void workspace.adminData.deleteAdminUser(selectedUser.userID);
                      }
                    }}>
                      <Trash2 size={15} />
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {workspace.adminData.manageSection === "skills" ? (
        <section className="admin-layout">
          <div className="card admin-column">
            <h2>Skill 列表</h2>
            <div className="admin-list">
              {workspace.adminData.adminSkills.map((skill) => (
                <div key={skill.skillID} className={`admin-list-row ${selectedSkill?.skillID === skill.skillID ? "selected" : ""}`}>
                  <div>
                    <strong>{skill.displayName}</strong>
                    <small>{skill.departmentName} · {skill.publisherName}</small>
                  </div>
                  <div className="button-row">
                    {skill.status !== "delisted" ? <button onClick={() => void workspace.adminData.delistAdminSkill(skill.skillID)}>下架</button> : <button onClick={() => void workspace.adminData.relistAdminSkill(skill.skillID)}>上架</button>}
                    <button className="danger-button" onClick={() => {
                      if (window.confirm(`确认归档 ${skill.displayName} 吗？`)) {
                        void workspace.adminData.archiveAdminSkill(skill.skillID);
                      }
                    }}>
                      <Archive size={15} />
                      归档
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card admin-detail">
            <h2>管理说明</h2>
            <p>上下架和归档都由后端再次校验部门范围与管理员等级，前端只展示可操作入口。</p>
            <div className="detail-block-grid">
              {workspace.adminData.adminSkills.map((skill) => (
                <article className="detail-block" key={skill.skillID}>
                  <div className="card-topline">
                    <span className="badge">{skill.status}</span>
                    <small>{formatDate(skill.updatedAt)}</small>
                  </div>
                  <h3>{skill.displayName}</h3>
                  <small>{skill.skillID}</small>
                  <small>{skill.departmentName} · {skill.publisherName}</small>
                  <small>Star {skill.starCount} · 下载 {skill.downloadCount}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function DepartmentTree({
  nodes,
  selectedDepartmentID,
  onSelect
}: {
  nodes: ReturnType<typeof useP1Workspace>["adminData"]["departments"];
  selectedDepartmentID: string | null;
  onSelect: (departmentID: string) => void;
}) {
  return (
    <div className="tree-list">
      {nodes.map((node) => (
        <div className="tree-node" key={node.departmentID}>
          <button className={selectedDepartmentID === node.departmentID ? "tree-button selected" : "tree-button"} onClick={() => onSelect(node.departmentID)}>
            <ChevronRight size={14} />
            <span>{node.name}</span>
            <small>{node.userCount}</small>
          </button>
          {node.children.length > 0 ? <div className="tree-children"><DepartmentTree nodes={node.children} selectedDepartmentID={selectedDepartmentID} onSelect={onSelect} /></div> : null}
        </div>
      ))}
    </div>
  );
}

function flattenDepartments(nodes: ReturnType<typeof useP1Workspace>["adminData"]["departments"]): ReturnType<typeof useP1Workspace>["adminData"]["departments"] {
  const items: ReturnType<typeof useP1Workspace>["adminData"]["departments"] = [];
  for (const node of nodes) {
    items.push(node);
    items.push(...flattenDepartments(node.children));
  }
  return items;
}

function ToolsPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  return (
    <section>
      <div className="section-heading"><h1>工具</h1><button onClick={() => void workspace.refreshTools()}><RefreshCw size={16} />刷新检测</button></div>
      <div className="card-grid">
        {workspace.tools.map((tool) => (
          <article className="card" key={tool.toolID}>
            <div className="card-topline"><span className="skill-icon"><CircleGauge size={20} /></span><span className="badge">{tool.status}</span></div>
            <h2>{tool.name}</h2>
            <p>转换策略：{tool.transform}</p>
            <small>配置路径：{tool.configPath}</small>
            <small>skills 路径：{tool.skillsPath}</small>
            <strong>{tool.enabledSkillCount} 个已启用 Skill</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectsPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  return (
    <section>
      <div className="section-heading"><h1>项目</h1><button>添加项目</button></div>
      <div className="alert info">项目级路径与工具级路径冲突时，项目级优先。</div>
      <div className="card-grid">
        {workspace.projects.map((project) => (
          <article className="card" key={project.projectID}>
            <h2>{project.name}</h2>
            <small>项目路径：{project.projectPath}</small>
            <small>skills 路径：{project.skillsPath}</small>
            <strong>{project.enabledSkillCount} 个项目级启用</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotificationsPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  if (!workspace.loggedIn) {
    return <AuthGateCard title="通知需要登录后同步" body="登录后可查看企业服务端通知、标记已读并同步离线事件。" onLogin={() => workspace.requireAuth("notifications")} />;
  }

  return (
    <section>
      <div className="section-heading">
        <h1>通知</h1>
        <div className="button-row"><button onClick={() => void workspace.markNotificationsRead("all")}>全部标记已读</button><button onClick={() => void workspace.syncOfflineEvents()}>同步本地事件（{workspace.offlineEvents.length}）</button></div>
      </div>
      <div className="card notification-list">
        {workspace.notifications.map((notification) => (
          <button key={notification.notificationID} className={notification.unread ? "notification unread" : "notification"} onClick={() => { workspace.openPage(notification.targetPage); void workspace.markNotificationsRead([notification.notificationID]); }}>
            <strong>{notification.title}</strong>
            <span>{notification.summary}</span>
            <small>{notification.source} · {formatDate(notification.occurredAt)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({ workspace }: { workspace: ReturnType<typeof useP1Workspace> }) {
  const centralStorePath = useMemo(() => "%APPDATA%\\EnterpriseAgentHub\\CentralStore", []);
  return (
    <section className="settings-page">
      <h1>设置</h1>
      <div className="card-grid">
        <div className="card"><h2>语言</h2><p>当前：{workspace.bootstrap.user.locale}</p></div>
        <div className="card"><h2>Central Store</h2><p>{centralStorePath}</p><small>前端只展示路径；本地文件写入必须由 Tauri 命令完成。</small></div>
        <div className="card"><h2>同步偏好</h2><p>{workspace.loggedIn ? "联网后自动同步本地 enable/disable 结果。" : "登录后自动同步远端市场与通知。"} </p><button onClick={() => void workspace.refreshBootstrap()}>{workspace.loggedIn ? "刷新启动上下文" : "登录并同步"}</button></div>
      </div>
    </section>
  );
}

function OperationToast({ progress }: { progress: NonNullable<ReturnType<typeof useP1Workspace>["progress"]> }) {
  return (
    <aside className={`operation-toast ${progress.result}`} role="status">
      <strong>{progress.operation} · {progress.stage}</strong>
      <span>{progress.message}</span>
    </aside>
  );
}

export function App() {
  const workspace = useP1Workspace();
  return <Shell workspace={workspace} />;
}
