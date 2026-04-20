const stageMount = document.querySelector("#stageMount");
const navMount = document.querySelector("#navMount");
const floatingMount = document.querySelector("#floatingMount");
const notificationCount = document.querySelector("#notificationCount");
const avatarName = document.querySelector("#avatarName");
const avatarDot = document.querySelector("#avatarDot");

const skills = [
  {
    id: "smart-reviewer",
    name: "Smart Reviewer",
    description: "围绕代码审查、风险摘要和变更建议，快速产出工程可执行意见。",
    category: "代码",
    tags: ["推荐", "代码", "治理"],
    author: "Li Ming",
    department: "平台研发部",
    version: "1.4.2",
    localVersion: "1.3.9",
    stars: 182,
    downloads: 2400,
    risk: "低",
    state: "update_available",
    readme: "支持 Pull Request 风险拆解、变更摘要、发布前检查建议。",
    cover: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=960&q=80",
    compatibleTools: ["Codex", "Cursor", "Claude"],
    enabledTargets: ["Codex", "Enterprise Web"],
    updatedAt: "今天 09:20"
  },
  {
    id: "sentinel-guard",
    name: "Sentinel Guard",
    description: "聚焦安全扫描、风险分层和上线前阻断建议，适合企业内控流程。",
    category: "安全",
    tags: ["安全", "审核", "推荐"],
    author: "Zhao Wen",
    department: "安全治理部",
    version: "2.1.0",
    localVersion: "2.1.0",
    stars: 356,
    downloads: 4310,
    risk: "中",
    state: "enabled",
    readme: "内置依赖清单扫描、密钥暴露检测和审查结论摘要。",
    cover: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=960&q=80",
    compatibleTools: ["Codex", "Windsurf", "Claude"],
    enabledTargets: ["Codex", "Claude", "Payments Service"],
    updatedAt: "昨天 17:40"
  },
  {
    id: "prompt-studio",
    name: "Prompt Studio",
    description: "沉淀团队提示词模板、使用约束和变体实验，适合日常协作沉淀。",
    category: "协作",
    tags: ["协作", "文档", "模板"],
    author: "Chen Yu",
    department: "产品设计部",
    version: "0.9.4",
    localVersion: null,
    stars: 97,
    downloads: 890,
    risk: "低",
    state: "not_installed",
    readme: "支持模板收藏、参数化占位和团队提示词评审记录。",
    cover: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=960&q=80",
    compatibleTools: ["Claude", "Cursor"],
    enabledTargets: [],
    updatedAt: "2 天前"
  },
  {
    id: "flow-builder",
    name: "Flow Builder",
    description: "将任务步骤拆成可复用流程，便于跨团队共享自动化执行路径。",
    category: "自动化",
    tags: ["自动化", "工作流", "推荐"],
    author: "Liu Fei",
    department: "智能平台部",
    version: "1.1.3",
    localVersion: "1.1.3",
    stars: 214,
    downloads: 1780,
    risk: "低",
    state: "installed",
    readme: "适合沉淀常用审批、发布和巡检动作，减少重复操作。",
    cover: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=960&q=80",
    compatibleTools: ["Codex", "Cursor", "opencode"],
    enabledTargets: ["Release Toolkit"],
    updatedAt: "今天 11:10"
  },
  {
    id: "doc-pilot",
    name: "Doc Pilot",
    description: "帮助团队统一需求整理、周报生成与知识归档，提高文档一致性。",
    category: "文档",
    tags: ["文档", "知识库", "协作"],
    author: "Wang Rui",
    department: "PMO",
    version: "1.0.8",
    localVersion: null,
    stars: 76,
    downloads: 660,
    risk: "低",
    state: "not_installed",
    readme: "自动汇总会议纪要、需求变更和交付进展，适合跨部门协作。",
    cover: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=960&q=80",
    compatibleTools: ["Codex", "Claude"],
    enabledTargets: [],
    updatedAt: "3 天前"
  },
  {
    id: "team-radar",
    name: "Team Radar",
    description: "把任务状态、评审节奏和发布窗口汇总成可读的团队运行视图。",
    category: "治理",
    tags: ["治理", "运营", "协作"],
    author: "Sun Hao",
    department: "工程效率部",
    version: "3.0.1",
    localVersion: "3.0.1",
    stars: 301,
    downloads: 3520,
    risk: "中",
    state: "restricted",
    readme: "适合管理者查看团队交付节奏、未结风险和任务积压。",
    cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=960&q=80",
    compatibleTools: ["Codex", "Claude", "Cursor"],
    enabledTargets: ["Codex"],
    updatedAt: "今天 08:05"
  }
];

const notifications = [
  {
    id: "notify-review",
    title: "API Generator 已进入审核",
    summary: "待审核队列中有新的发布申请。",
    time: "6 分钟前",
    target: "manage",
    unread: true
  },
  {
    id: "notify-update",
    title: "Smart Reviewer 有新版本可更新",
    summary: "本机已安装版本 1.3.9，可升级到 1.4.2。",
    time: "30 分钟前",
    target: "local",
    unread: true
  },
  {
    id: "notify-publish",
    title: "Prompt Studio 提交成功",
    summary: "发布中心已记录新的提交版本。",
    time: "今天 09:15",
    target: "community",
    unread: false
  }
];

const departments = [
  {
    id: "dept-group",
    parentId: null,
    name: "集团",
    path: "/集团",
    level: 0,
    status: "active",
    scopeLabel: "全局治理范围",
    summary: "系统一级管理节点，统一承接账号、部门、审核与跨部门风险处置。",
    note: "根节点不可修改或删除，只用于总览和分配下级管理范围。",
    skillCount: 18,
    featuredSkills: [
      { name: "Sentinel Guard", owner: "安全治理部", status: "已发布" },
      { name: "Team Radar", owner: "工程效率组", status: "已发布" }
    ]
  },
  {
    id: "dept-tech",
    parentId: "dept-group",
    name: "技术部",
    path: "/集团/技术部",
    level: 1,
    status: "active",
    scopeLabel: "技术部及下级可管理",
    summary: "负责桌面客户端、服务端能力和开发效率工具，是当前演示中的主治理范围。",
    note: "技术部下级节点较多，适合展示树结构、成员分布和部门维护动作。",
    skillCount: 12,
    featuredSkills: [
      { name: "Smart Reviewer", owner: "Li Ming", status: "已发布" },
      { name: "Flow Builder", owner: "Liu Fei", status: "已启用" }
    ]
  },
  {
    id: "dept-front",
    parentId: "dept-tech",
    name: "前端组",
    path: "/集团/技术部/前端组",
    level: 2,
    status: "active",
    scopeLabel: "前端交付与组件规范",
    summary: "负责桌面端界面、交互规范和页面实现，也是当前用户管理最密集的节点。",
    note: "前端组同时包含管理员与普通成员，适合联动查看账号状态和发布行为。",
    skillCount: 5,
    featuredSkills: [
      { name: "Release Toolkit", owner: "frontadmin", status: "已发布" },
      { name: "Prompt Studio", owner: "demo", status: "审核中" }
    ]
  },
  {
    id: "dept-back",
    parentId: "dept-tech",
    name: "后端组",
    path: "/集团/技术部/后端组",
    level: 2,
    status: "active",
    scopeLabel: "服务端与权限服务",
    summary: "负责 API、权限、审计与部署接口，是审核链路和权限模型的重要承接节点。",
    note: "当前后端组节点较精简，用于演示树结构下的轻量维护场景。",
    skillCount: 4,
    featuredSkills: [
      { name: "API Generator", owner: "backend_admin", status: "待审核" },
      { name: "Sentinel Guard", owner: "backend_admin", status: "已发布" }
    ]
  },
  {
    id: "dept-ops",
    parentId: "dept-group",
    name: "运维组",
    path: "/集团/运维组",
    level: 1,
    status: "active",
    scopeLabel: "环境与部署治理",
    summary: "负责部署、巡检和稳定性保障，适合展示跨团队协作场景。",
    note: "运维组当前无下级部门，但保留新增下级部门入口。",
    skillCount: 3,
    featuredSkills: [
      { name: "Release Toolkit", owner: "author_ops", status: "已启用" },
      { name: "Flow Builder", owner: "author_ops", status: "已发布" }
    ]
  },
  {
    id: "dept-design",
    parentId: "dept-group",
    name: "设计平台组",
    path: "/集团/设计平台组",
    level: 1,
    status: "active",
    scopeLabel: "设计规范与内容协作",
    summary: "负责设计系统、交互规范和文案协同，适合演示跨部门引用 Skill 的组织关系。",
    note: "设计平台组聚焦内容和规范协作，适合和技术部形成对比。",
    skillCount: 4,
    featuredSkills: [
      { name: "Doc Pilot", owner: "author_design", status: "已发布" },
      { name: "Prompt Studio", owner: "author_design", status: "已启用" }
    ]
  },
  {
    id: "dept-lab",
    parentId: "dept-group",
    name: "创新实验室",
    path: "/集团/创新实验室",
    level: 1,
    status: "draft",
    scopeLabel: "待分配管理员",
    summary: "用于演示新增部门后的收纳位置，目前尚未分配管理员和用户。",
    note: "草建节点可以继续扩展下级部门，但正式启用前需要补齐管理员。",
    skillCount: 0,
    featuredSkills: []
  }
];

const users = [
  {
    id: "user-superadmin",
    displayName: "系统管理员",
    username: "superadmin",
    departmentId: "dept-group",
    role: "admin",
    adminLevel: 1,
    status: "active",
    published: 12,
    stars: 6,
    lastLogin: "刚刚",
    summary: "负责全局账号开通、跨部门治理和一级风险处置。"
  },
  {
    id: "user-tech-admin",
    displayName: "技术部管理员",
    username: "engadmin",
    departmentId: "dept-tech",
    role: "admin",
    adminLevel: 2,
    status: "active",
    published: 7,
    stars: 3,
    lastLogin: "今天 09:48",
    summary: "负责技术部及下级团队的账号、审核和部门维护。"
  },
  {
    id: "user-front-admin",
    displayName: "前端组管理员",
    username: "frontadmin",
    departmentId: "dept-front",
    role: "admin",
    adminLevel: 3,
    status: "active",
    published: 5,
    stars: 9,
    lastLogin: "今天 08:36",
    summary: "负责前端组成员管理和前端相关 Skill 的发布治理。"
  },
  {
    id: "user-demo",
    displayName: "张三",
    username: "demo",
    departmentId: "dept-front",
    role: "normal_user",
    adminLevel: null,
    status: "active",
    published: 3,
    stars: 7,
    lastLogin: "今天 10:11",
    summary: "前端组普通成员，发布过多条提示词和交付辅助类 Skill。"
  },
  {
    id: "user-author-frontend",
    displayName: "李四",
    username: "author_frontend",
    departmentId: "dept-front",
    role: "normal_user",
    adminLevel: null,
    status: "frozen",
    published: 2,
    stars: 4,
    lastLogin: "昨天 19:06",
    summary: "账号已冻结，用于演示会话失效与状态回显。"
  },
  {
    id: "user-backend-admin",
    displayName: "后端组管理员",
    username: "backend_admin",
    departmentId: "dept-back",
    role: "admin",
    adminLevel: 3,
    status: "active",
    published: 4,
    stars: 5,
    lastLogin: "今天 08:52",
    summary: "负责后端组审核链路和接口治理。"
  },
  {
    id: "user-author-design",
    displayName: "王五",
    username: "author_design",
    departmentId: "dept-design",
    role: "normal_user",
    adminLevel: null,
    status: "active",
    published: 4,
    stars: 11,
    lastLogin: "今天 09:21",
    summary: "设计平台组成员，偏向文档与规范协作方向。"
  },
  {
    id: "user-author-ops",
    displayName: "赵六",
    username: "author_ops",
    departmentId: "dept-ops",
    role: "normal_user",
    adminLevel: null,
    status: "active",
    published: 2,
    stars: 5,
    lastLogin: "今天 07:58",
    summary: "运维组成员，负责发布部署类 Skill。"
  }
];

const reviews = [
  {
    id: "review-1",
    name: "API Generator",
    submitter: "Hu Lei",
    department: "平台研发部",
    type: "首次发布",
    risk: "低",
    time: "10 分钟前",
    summary: "自动生成 FastAPI 接口骨架和鉴权中间件。",
    preview: `name: api-generator\nversion: 1.0.0\nscope: department_tree\nvisibility: detail_visible\n\n## 核心能力\n1. 读取 JSON Schema\n2. 生成路由、DTO 和服务模板\n3. 内置 JWT 鉴权示例`
  },
  {
    id: "review-2",
    name: "Doc Helper",
    submitter: "Qian Yu",
    department: "产品设计部",
    type: "更新发布",
    risk: "低",
    time: "45 分钟前",
    summary: "增强文档比对和版本摘要生成。",
    preview: `name: doc-helper\nversion: 2.4.0\nscope: selected_departments\nvisibility: summary_visible\n\n## 更新摘要\n- 增加文档结构比对\n- 新增模板变量填充`
  }
];

const publishedSkills = [
  {
    id: "published-release-toolkit",
    skillRef: "flow-builder",
    name: "Release Toolkit",
    skillId: "release-toolkit",
    description: "沉淀发布前检查、版本摘要和回滚清单，统一团队发布动作。",
    version: "1.0.0",
    status: "published",
    scope: "平台研发部",
    visibility: "摘要公开",
    updatedAt: "今天 10:42",
    downloads: 126,
    stars: 28,
    auditStage: "审核通过",
    reviewNote: "已通过首发审核，要求保留回滚说明与风险边界。",
    rejectReason: "无",
    versionHistory: ["1.0.0 · 首次发布 · 今天 10:42"],
    permissionHistory: ["摘要公开 · 初始权限 · 今天 10:42"],
    files: ["SKILL.md", "README.md", "manifest.json", "checks/release.md"],
    preview: `name: release-toolkit\nversion: 1.0.0\nvisibility: summary_visible\nscope: platform_rd\n\n## 核心能力\n1. 生成发布前检查清单\n2. 汇总版本摘要与回滚项\n3. 输出标准化发布记录`
  },
  {
    id: "published-prompt-governor",
    skillRef: "prompt-studio",
    name: "Prompt Governor",
    skillId: "prompt-governor",
    description: "统一团队提示词审校、敏感词约束和提交前自检流程。",
    version: "0.9.0",
    status: "pending_review",
    scope: "产品设计部",
    visibility: "详情公开",
    updatedAt: "今天 09:15",
    downloads: 0,
    stars: 0,
    auditStage: "等待管理员初审",
    reviewNote: "待补充提示词越权边界与导出说明。",
    rejectReason: "无",
    versionHistory: ["0.9.0 · 提交审核 · 今天 09:15"],
    permissionHistory: ["详情公开 · 提交时设置 · 今天 09:15"],
    files: ["SKILL.md", "policy.md", "examples/prompts.md"],
    preview: `name: prompt-governor\nversion: 0.9.0\nvisibility: detail_visible\nscope: design_team\n\n## 审核待补充\n- 明确越权提示处理\n- 增加敏感词白名单来源\n- 说明导出内容边界`
  },
  {
    id: "published-team-radar-lite",
    skillRef: "team-radar",
    name: "Team Radar Lite",
    skillId: "team-radar-lite",
    description: "面向项目经理的轻量团队节奏看板，支持周节奏与风险跟踪。",
    version: "1.3.0",
    status: "offline",
    scope: "工程效率部",
    visibility: "全员可安装",
    updatedAt: "昨天 18:20",
    downloads: 812,
    stars: 63,
    auditStage: "已下架",
    reviewNote: "由于能力边界调整，当前版本已临时下架等待新版本。",
    rejectReason: "无",
    versionHistory: ["1.3.0 · 临时下架前版本 · 昨天 18:20", "1.2.4 · 扩大到全员可安装 · 3 天前"],
    permissionHistory: ["全员可安装 · 昨天 18:20", "详情公开 · 2026-04-12"],
    files: ["SKILL.md", "dashboard-template.md", "manifest.json"],
    preview: `name: team-radar-lite\nversion: 1.3.0\nvisibility: installable_all\nscope: efficiency_team\n\n## 下架说明\n- 需要拆分权限范围\n- 保留现有下载记录\n- 等待 1.4.0 重新提交`
  }
];

const tools = [
  { id: "tool-codex", name: "Codex", status: "已连接", skills: 6, path: "~/.codex/skills", description: "统一管理 Skills 目录、工具适配和启用落点。" },
  { id: "tool-claude", name: "Claude", status: "已连接", skills: 4, path: "~/.claude/skills", description: "保留模板同步和本地能力映射。" },
  { id: "tool-cursor", name: "Cursor", status: "需确认路径", skills: 2, path: "/Applications/Cursor.app", description: "当前需要重新扫描 Skills 安装路径。" }
];

const projects = [
  { id: "project-web", name: "Enterprise Web", status: "已启用", skills: 3, path: "~/Work/enterprise-web", description: "项目级路径优先于工具级配置，当前已落地 3 个 Skill。" },
  { id: "project-payments", name: "Payments Service", status: "已启用", skills: 1, path: "~/Work/payments-service", description: "保留项目级覆盖，避免和通用工具目录冲突。" },
  { id: "project-design", name: "Design System", status: "待配置", skills: 0, path: "~/Work/design-system", description: "尚未设置项目级 Skills 安装路径。" }
];

const diagnostics = [
  { title: "Cursor 路径需要确认", summary: "未能稳定识别 Skills 安装路径，建议重新检测。" },
  { title: "Team Radar 权限已收缩", summary: "当前本机版本可继续使用，但不可新增启用位置。" },
  { title: "Release Toolkit 缺少同步记录", summary: "建议重新执行启用动作，确认落地目录一致。" }
];

const state = {
  theme: "light",
  activeStage: "home",
  loggedIn: true,
  user: {
    name: "Lin Aurora",
    department: "平台研发部",
    isAdmin: true
  },
  menu: null,
  settingsOpen: false,
  loginOpen: false,
  detailSkillId: null,
  detailPageSkillId: null,
  detailPageSourceStage: null,
  drawer: null,
  scopeSkillId: null,
  scopeDraft: [],
  communityMode: "skills",
  communityTag: "全部",
  communityQuery: "",
  communitySort: "recommended",
  communityLeaderboard: "downloads",
  localMode: "skills",
  localQuery: "",
  localFilter: "全部",
  selectedPublishedSkillId: "published-release-toolkit",
  selectedLocalSkillId: "smart-reviewer",
  selectedToolId: "tool-codex",
  selectedProjectId: "project-web",
  manageTab: "departments",
  selectedDepartmentId: "dept-tech",
  selectedUserId: "user-tech-admin",
  manageDepartmentQuery: "",
  manageDepartmentView: "children",
  manageUserQuery: "",
  manageUserRoleFilter: "all",
  manageUserStatusFilter: "all",
  collapsedDepartmentIds: [],
  selectedManagedSkillId: "smart-reviewer",
  selectedReviewId: "review-1",
  pendingAction: null,
  loginForm: {
    username: "",
    password: ""
  }
};

const communityTags = ["全部", "推荐", "代码", "安全", "治理", "协作", "文档", "自动化"];
const localFilters = ["全部", "已启用", "待更新", "权限收缩", "异常"];
const manageDepartmentViews = [
  { id: "children", label: "直属下级" },
  { id: "users", label: "本部门用户" },
  { id: "skills", label: "部门 Skills" }
];
const manageRoleFilters = [
  { id: "all", label: "全部角色" },
  { id: "admins", label: "管理员" },
  { id: "members", label: "普通用户" }
];
const manageStatusFilters = [
  { id: "all", label: "全部状态" },
  { id: "active", label: "正常" },
  { id: "frozen", label: "冻结" }
];

function initials(value) {
  return value
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function unreadCount() {
  return notifications.filter((item) => item.unread).length;
}

function isAdminVisible() {
  return state.loggedIn && state.user.isAdmin;
}

function getSkill(skillId) {
  return skills.find((skill) => skill.id === skillId);
}

function getLocalSkills() {
  return skills.filter((skill) => skill.localVersion);
}

function getPublishedSkill(skillId) {
  return publishedSkills.find((skill) => skill.id === skillId);
}

function getLocalEntities() {
  if (state.localMode === "tools") return tools;
  if (state.localMode === "projects") return projects;
  return filteredLocalSkills();
}

function selectDefaultLocalEntity(mode = state.localMode) {
  state.selectedLocalSkillId = mode === "skills" ? getLocalSkills()[0]?.id ?? null : null;
  state.selectedToolId = mode === "tools" ? tools[0]?.id ?? null : null;
  state.selectedProjectId = mode === "projects" ? projects[0]?.id ?? null : null;
}

function selectedLocalEntity() {
  if (state.localMode === "tools") {
    return tools.find((tool) => tool.id === state.selectedToolId) ?? null;
  }
  if (state.localMode === "projects") {
    return projects.find((project) => project.id === state.selectedProjectId) ?? null;
  }
  return getSkill(state.selectedLocalSkillId) ?? null;
}

function selectedPublishedSkill() {
  return getPublishedSkill(state.selectedPublishedSkillId) ?? publishedSkills[0] ?? null;
}

function getDepartmentById(departmentId) {
  return departments.find((department) => department.id === departmentId) ?? null;
}

function getDepartmentChildren(parentId) {
  return departments.filter((department) => department.parentId === parentId);
}

function getDepartmentDescendantIds(departmentId) {
  const ids = [departmentId];
  getDepartmentChildren(departmentId).forEach((child) => {
    ids.push(...getDepartmentDescendantIds(child.id));
  });
  return ids;
}

function getDepartmentManagers(departmentId) {
  return users.filter((user) => user.departmentId === departmentId && user.role === "admin");
}

function getDepartmentUsers(departmentId, includeDescendants = true) {
  const allowedDepartmentIds = includeDescendants ? new Set(getDepartmentDescendantIds(departmentId)) : new Set([departmentId]);
  return users.filter((user) => user.status !== "deleted" && allowedDepartmentIds.has(user.departmentId));
}

function departmentStatusMeta(department) {
  if (department.status === "draft") return { label: "待补齐", tone: "warning" };
  if (department.status === "disabled") return { label: "停用", tone: "danger" };
  return { label: "active", tone: "success" };
}

function userRoleLabel(user) {
  return user.role === "admin" ? `管理员 L${user.adminLevel}` : "普通用户";
}

function userStatusMeta(user) {
  if (user.status === "frozen") return { label: "冻结", tone: "warning" };
  if (user.status === "deleted") return { label: "已删除", tone: "danger" };
  return { label: "正常", tone: "success" };
}

function getUserDepartment(user) {
  return getDepartmentById(user.departmentId);
}

function departmentMatchesQuery(department, query) {
  if (!query) return true;
  const haystack = [department.name, department.path, department.summary, department.scopeLabel].join(" ").toLowerCase();
  return haystack.includes(query);
}

function departmentSubtreeMatchesQuery(departmentId, query) {
  const department = getDepartmentById(departmentId);
  if (!department) return false;
  if (departmentMatchesQuery(department, query)) return true;
  return getDepartmentChildren(departmentId).some((child) => departmentSubtreeMatchesQuery(child.id, query));
}

function getVisibleDepartmentTree() {
  const query = state.manageDepartmentQuery.trim().toLowerCase();
  const collapsed = new Set(state.collapsedDepartmentIds);
  const rows = [];

  function visit(parentId, depth) {
    getDepartmentChildren(parentId).forEach((department) => {
      if (query && !departmentSubtreeMatchesQuery(department.id, query)) {
        return;
      }

      const children = getDepartmentChildren(department.id);
      const isCollapsed = collapsed.has(department.id);
      rows.push({
        department,
        depth,
        hasChildren: children.length > 0,
        isCollapsed
      });

      if (children.length && (!isCollapsed || query)) {
        visit(department.id, depth + 1);
      }
    });
  }

  visit(null, 0);
  return rows;
}

function filteredManageUsers() {
  const query = state.manageUserQuery.trim().toLowerCase();
  return users
    .filter((user) => user.status !== "deleted")
    .filter((user) => {
      if (state.manageUserRoleFilter === "admins") return user.role === "admin";
      if (state.manageUserRoleFilter === "members") return user.role !== "admin";
      return true;
    })
    .filter((user) => {
      if (state.manageUserStatusFilter === "all") return true;
      return user.status === state.manageUserStatusFilter;
    })
    .filter((user) => {
      if (!query) return true;
      const department = getUserDepartment(user);
      const haystack = [user.displayName, user.username, department?.name ?? "", department?.path ?? "", user.summary].join(" ").toLowerCase();
      return haystack.includes(query);
    });
}

function countSubtreeAdmins(departmentId) {
  return getDepartmentUsers(departmentId).filter((user) => user.role === "admin").length;
}

function manageDepartmentMetrics(department) {
  const directChildren = getDepartmentChildren(department.id);
  const subtreeUsers = getDepartmentUsers(department.id);
  const directManagers = getDepartmentManagers(department.id);
  return {
    directChildren: directChildren.length,
    users: subtreeUsers.length,
    managers: directManagers.length,
    skills: department.skillCount
  };
}

function selectedManageUsers() {
  const filtered = filteredManageUsers();
  return filtered.find((user) => user.id === state.selectedUserId) ?? filtered[0] ?? null;
}

function statusMeta(skill) {
  if (skill.state === "update_available") return { label: "待更新", tone: "warning" };
  if (skill.state === "enabled") return { label: "已启用", tone: "success" };
  if (skill.state === "installed") return { label: "已安装", tone: "success" };
  if (skill.state === "restricted") return { label: "权限收缩", tone: "danger" };
  return { label: "未安装", tone: "warning" };
}

function publishedStatusMeta(skill) {
  if (skill.status === "published") return { label: "已发布", tone: "success" };
  if (skill.status === "pending_review") return { label: "待审核", tone: "warning" };
  if (skill.status === "offline") return { label: "已下架", tone: "danger" };
  if (skill.status === "archived") return { label: "已归档", tone: "warning" };
  if (skill.status === "withdrawn") return { label: "已撤回", tone: "warning" };
  if (skill.status === "rejected") return { label: "已退回", tone: "danger" };
  return { label: "草稿", tone: "warning" };
}

function primaryActionLabel(skill) {
  if (skill.state === "update_available") return "更新";
  if (skill.localVersion) return "启用";
  return "安装";
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN", { notation: value >= 1000 ? "compact" : "standard", compactDisplay: "short" }).format(value);
}

function entityMark(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function renderSkillInitial(name, size = "md", soft = false, extraClass = "") {
  const mark = entityMark(name) || name.trim().slice(0, 1).toUpperCase();
  const classes = ["skill-initial-badge", size];
  if (soft) classes.push("soft");
  if (extraClass) classes.push(extraClass);
  return `<span class="${classes.join(" ")}">${escapeHtml(mark)}</span>`;
}

function rankToneClass(index) {
  return ["tone-blue", "tone-green", "tone-orange", "tone-purple"][index % 4];
}

function renderSidebarHeader(mark, label) {
  return `
    <div class="sidebar-header">
      <span class="sidebar-header-icon">${mark}</span>
      <h3>${label}</h3>
    </div>
  `;
}

function renderSwitcherNote(note) {
  if (!note) {
    return "";
  }
  const numeric = /^\d+$/.test(String(note));
  if (numeric) {
    return "";
  }
  return `<span class="switcher-note-pill">${note}</span>`;
}

function renderWorkspaceToolbar({ mark, label, description, actionLabel, actionAttrs = "" }) {
  return `
    <section class="stage-panel workspace-toolbar">
      <div class="stage-heading">
        <div class="workspace-toolbar-left">
          <div class="workspace-toolbar-titleline">
            ${renderSidebarHeader(mark, label)}
            ${description ? `<p class="workspace-toolbar-desc">${description}</p>` : ""}
          </div>
        </div>
        ${actionLabel ? `<button class="primary-button" type="button" ${actionAttrs}>${actionLabel}</button>` : ""}
      </div>
    </section>
  `;
}

function localToolbarConfig() {
  if (state.localMode === "tools") {
    return {
      mark: "工",
      label: "工具",
      description: "查看工具安装路径、Skills 目录和启用落点。",
      actionLabel: "扫描",
      actionAttrs: 'data-action="open-drawer" data-drawer="diagnostics"'
    };
  }

  if (state.localMode === "projects") {
    return {
      mark: "项",
      label: "项目",
      description: "管理项目级路径、覆盖关系和启用落点。",
      actionLabel: "扫描",
      actionAttrs: 'data-action="open-drawer" data-drawer="diagnostics"'
    };
  }

  return {
    mark: "技",
    label: "Skills",
    description: "管理已安装 Skill、本机启用状态、更新窗口和异常摘要。",
    actionLabel: "扫描",
    actionAttrs: 'data-action="open-drawer" data-drawer="diagnostics"'
  };
}

function communityToolbarConfig() {
  if (state.communityMode === "publish") {
    return {
      mark: "发",
      label: "发布",
      description: "上传 Skill 文件夹或 zip 包，填写元数据并提交审核。",
      actionLabel: ""
    };
  }

  if (state.communityMode === "mine") {
    return {
      mark: "我",
      label: "我的",
      description: "查看我发布的 Skill、审核状态、公开级别和上下架动作。",
      actionLabel: ""
    };
  }

  if (state.communityMode === "mcp") {
    return {
      mark: "M",
      label: "MCP",
      description: "保留入口，后续再接入正式能力。",
      actionLabel: ""
    };
  }

  if (state.communityMode === "plugins") {
    return {
      mark: "插",
      label: "插件",
      description: "保留入口，后续再接入正式能力。",
      actionLabel: ""
    };
  }

  return {
    mark: "技",
    label: "Skills",
    description: "搜索、排序和筛选 Skill，右侧热榜承接热门发现。",
    actionLabel: ""
  };
}

function manageToolbarConfig() {
  if (state.manageTab === "reviews") {
    return {
      mark: "审",
      label: "审核",
      description: "处理待审核、审核中和已审核的单据。",
      actionLabel: "批量审核",
      actionAttrs: ""
    };
  }

  if (state.manageTab === "skills") {
    return {
      mark: "技",
      label: "Skills",
      description: "查看 Skill 生命周期、状态和治理动作。",
      actionLabel: "批量管理",
      actionAttrs: ""
    };
  }

  if (state.manageTab === "users") {
    return {
      mark: "用",
      label: "用户",
      description: "围绕搜索、筛选、角色调整和冻结解冻形成高密度账号治理台。",
      actionLabel: "新增用户",
      actionAttrs: 'data-action="open-drawer" data-drawer="create-user"'
    };
  }

  return {
    mark: "部",
    label: "部门",
    description: "回到树结构管理部门，中心区联动下级部门、成员和 Skill 概览。",
    actionLabel: "新增下级部门",
    actionAttrs: 'data-action="open-drawer" data-drawer="create-department"'
  };
}

function stageLabel(stage) {
  if (stage === "community") return "社区";
  if (stage === "local") return "本地";
  if (stage === "manage") return "管理";
  return "主页";
}

function getScopeOptions(skill) {
  const options = [
    ...skill.compatibleTools,
    ...projects.map((project) => project.name),
    ...skill.enabledTargets
  ];
  return [...new Set(options)];
}

function getScopeTargets(skill) {
  const builtinTools = [
    { name: "Codex", fallbackPath: "~/.codex/skills" },
    { name: "Claude", fallbackPath: "~/.claude/skills" },
    { name: "Cursor", fallbackPath: "~/Library/Application Support/Cursor/User/rules" },
    { name: "Windsurf", fallbackPath: "~/.codeium/windsurf/memories" },
    { name: "opencode", fallbackPath: "~/.config/opencode/skills" }
  ];

  const toolTargets = builtinTools.map((item) => {
    const detected = tools.find((tool) => tool.name === item.name);
    const available = detected ? detected.status !== "需确认路径" : skill.compatibleTools.includes(item.name);
    const selected = state.scopeDraft.includes(item.name);
    const subtitle = detected
      ? `${detected.status === "已连接" ? "detected" : "check"} · ${available ? "已接入" : "不可用"}`
      : `${skill.compatibleTools.includes(item.name) ? "available" : "missing"} · ${skill.compatibleTools.includes(item.name) ? "可接入" : "不可用"}`;
    return {
      id: `tool-${item.name}`,
      value: item.name,
      title: item.name,
      path: detected?.path ?? item.fallbackPath,
      subtitle,
      available,
      selected
    };
  });

  const projectTargets = projects.map((project) => ({
    id: `project-${project.id}`,
    value: project.name,
    title: project.name,
    path: project.path,
    subtitle: `${project.status === "已启用" ? "项目级优先" : "项目级"} · ${project.status}`,
    available: true,
    selected: state.scopeDraft.includes(project.name)
  }));

  return [...toolTargets, ...projectTargets];
}

function openSkillDetailPage(skillId, sourceStage = state.activeStage) {
  state.detailPageSkillId = skillId;
  state.detailPageSourceStage = sourceStage;
  state.menu = null;
}

function closeSkillDetailPage() {
  state.detailPageSkillId = null;
  state.detailPageSourceStage = null;
}

function openPublishPage() {
  state.activeStage = "community";
  state.communityMode = "publish";
  closeSkillDetailPage();
  state.menu = null;
}

function closePublishPage() {
  state.communityMode = "skills";
}

function openScopeWindow(skillId) {
  const skill = getSkill(skillId);
  if (!skill) return;
  state.scopeSkillId = skillId;
  state.scopeDraft = [...skill.enabledTargets];
  state.menu = null;
}

function closeScopeWindow() {
  state.scopeSkillId = null;
  state.scopeDraft = [];
}

function localSkillIssues(skill) {
  if (skill.state === "restricted") {
    return ["权限已收缩，当前版本保留但不可新增启用位置。"];
  }
  if (skill.id === "flow-builder") {
    return ["Release Toolkit 的同步记录与目标目录不一致。"];
  }
  return [];
}

function filteredCommunitySkills() {
  let result = skills.filter((skill) => {
    const keyword = `${skill.name} ${skill.description} ${skill.tags.join(" ")} ${skill.author} ${skill.department}`.toLowerCase();
    const queryMatch = state.communityQuery.trim() ? keyword.includes(state.communityQuery.trim().toLowerCase()) : true;
    const tagMatch = state.communityTag === "全部" ? true : skill.tags.includes(state.communityTag) || skill.category === state.communityTag;
    return queryMatch && tagMatch;
  });

  if (state.communitySort === "stars") {
    result = [...result].sort((left, right) => right.stars - left.stars);
  } else if (state.communitySort === "downloads") {
    result = [...result].sort((left, right) => right.downloads - left.downloads);
  } else if (state.communitySort === "latest") {
    result = [...result].sort((left, right) => right.version.localeCompare(left.version));
  } else {
    result = [...result].sort((left, right) => {
      const leftScore = (left.tags.includes("推荐") ? 4 : 0) + left.stars / 100 + left.downloads / 1000;
      const rightScore = (right.tags.includes("推荐") ? 4 : 0) + right.stars / 100 + right.downloads / 1000;
      return rightScore - leftScore;
    });
  }

  return result;
}

function communityLeaderboardItems() {
  if (state.communityLeaderboard === "stars") {
    return [...skills].sort((left, right) => right.stars - left.stars).slice(0, 6);
  }

  if (state.communityLeaderboard === "trending") {
    return [...skills]
      .sort((left, right) => {
        const leftScore = (left.tags.includes("推荐") ? 6 : 0) + left.downloads / 1200 + left.stars / 120;
        const rightScore = (right.tags.includes("推荐") ? 6 : 0) + right.downloads / 1200 + right.stars / 120;
        return rightScore - leftScore;
      })
      .slice(0, 6);
  }

  return [...skills].sort((left, right) => right.downloads - left.downloads).slice(0, 6);
}

function filteredLocalSkills() {
  return getLocalSkills().filter((skill) => {
    const keyword = `${skill.name} ${skill.description} ${skill.id}`.toLowerCase();
    const queryMatch = state.localQuery.trim() ? keyword.includes(state.localQuery.trim().toLowerCase()) : true;
    if (!queryMatch) return false;
    if (state.localFilter === "已启用") return skill.enabledTargets.length > 0;
    if (state.localFilter === "待更新") return skill.state === "update_available";
    if (state.localFilter === "权限收缩") return skill.state === "restricted";
    if (state.localFilter === "异常") return localSkillIssues(skill).length > 0;
    return true;
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderNav() {
  const items = [
    { id: "community", label: "社区" },
    { id: "home", label: "主页" },
    { id: "local", label: "本地" }
  ];

  if (isAdminVisible()) {
    items.push({ id: "manage", label: "管理" });
  }

  navMount.innerHTML = items
    .map(
      (item) => `
        <button
          class="segment-button ${state.activeStage === item.id ? "active" : ""}"
          type="button"
          data-action="stage"
          data-stage="${item.id}"
        >
          ${item.label}
        </button>
      `
    )
    .join("");
}

function renderTopbar() {
  notificationCount.textContent = String(unreadCount());
  avatarName.textContent = state.loggedIn ? state.user.name : "访客";
  avatarDot.textContent = state.loggedIn ? initials(state.user.name) : "访";
}

function homeStage() {
  return `
    <section class="stage-shell home-stage">
      <div class="home-scroll">
        <div class="home-hero-single">
          <section class="hero-panel stage-panel hero-feature hero-feature-home">
            <div class="hero-copy hero-copy-home">
              <h1>Agent 探索</h1>
              <form class="prompt-composer" data-form="home-search">
                <textarea
                  name="query"
                  class="prompt-composer-input"
                  placeholder="向 Agent 提问，@ 添加文件，/ 输入命令，$ 使用技能"
                >${escapeHtml(state.communityQuery)}</textarea>
                <div class="prompt-composer-toolbar">
                  <div class="prompt-toolbar-left">
                    <button class="composer-icon-button" type="button" aria-label="添加">+</button>
                    <button class="composer-pill" type="button">完全访问权限</button>
                  </div>
                  <div class="prompt-toolbar-right">
                    <button class="composer-text-button" type="button">GPT-5.4</button>
                    <button class="composer-text-button" type="button">超高</button>
                    <button class="composer-icon-button muted" type="button" aria-label="语音">◌</button>
                    <button class="composer-submit" type="submit" aria-label="发送">↑</button>
                  </div>
                </div>
              </form>
              <div class="prompt-context-bar">
                <span class="prompt-context-pill">EnterpriseAgentHub</span>
                <span class="prompt-context-pill">本地工作</span>
                <span class="prompt-context-pill">main</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function communityPlaceholderPane(title) {
  return `
    <section class="stage-panel list-panel community-content-panel placeholder-span">
      <div class="placeholder-panel">
        <strong>${title} 暂未开放</strong>
        <p>当前原型只保留入口，用于确认社区导航结构与视觉层级。</p>
      </div>
    </section>
  `;
}

function communityPublishPane() {
  if (!state.loggedIn) {
    return `
      <section class="stage-panel publish-center-shell placeholder-span">
        <div class="publish-form-scroll publish-form-scroll-compact">
          <div class="publish-title-block">
            <h1>发布新技能</h1>
            <p>上传您的 Skill 文件，审核通过后将同步展示在 SkillHub 技能广场。</p>
          </div>
          <div class="detail-section">
            <strong>登录后继续</strong>
            <p>登录企业服务后即可上传 Skill 文件夹或 zip 包，并继续填写元数据、公开级别和变更说明。</p>
          </div>
          <div class="detail-actions">
            <button class="primary-button" type="button" data-action="open-login">登录企业服务</button>
            <button class="ghost-button" type="button" data-action="community-mode" data-mode="skills">返回 Skill</button>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="stage-panel publish-center-shell placeholder-span">
      <div class="publish-form-scroll">
        <div class="publish-title-block">
          <h1>发布新技能</h1>
          <p>上传您的 Skill 文件，审核通过后将同步展示在 SkillHub 技能广场。</p>
        </div>

        <div class="field-stack">
          <label class="publish-label">Skill 文件 <span class="required-mark">*</span></label>
          <section class="publish-dropzone">
            <div class="publish-dropzone-icon">↑</div>
            <strong>拖拽文件夹或 zip 包到此处</strong>
            <p>请确保文件夹或压缩包中包含 SKILL.md 文件（最多 200 个，总大小不超过 10.00 MB）</p>
            <div class="publish-upload-actions">
              <button class="primary-button" type="button">选择文件夹</button>
              <button class="ghost-button" type="button">选择 zip 文件</button>
            </div>
          </section>
        </div>

        <div class="field-stack">
          <label class="publish-label" for="publish-slug">Slug <span class="required-mark">*</span></label>
          <input id="publish-slug" placeholder="Skill 的唯一标识符，仅允许小写字母、数字和连字符" />
        </div>

        <div class="field-stack">
          <label class="publish-label" for="publish-display-name">显示名称 <span class="required-mark">*</span></label>
          <input id="publish-display-name" placeholder="Skill 显示名称" />
        </div>

        <div class="field-stack">
          <label class="publish-label" for="publish-description">描述</label>
          <textarea id="publish-description" placeholder="该描述会从 SKILL.md 文件的 description 字段中自动提取，也支持手动修改"></textarea>
        </div>

        <div class="field-stack">
          <label class="publish-label" for="publish-version">版本号 <span class="required-mark">*</span></label>
          <input id="publish-version" value="1.0.0" />
        </div>

        <div class="field-stack">
          <label class="publish-label" for="publish-visibility">公开级别 <span class="required-mark">*</span></label>
          <div class="publish-select-shell">
            <div class="publish-select-value">
              <strong>摘要公开</strong>
              <p>展示摘要字段，不开放详情</p>
            </div>
            <span class="publish-select-arrow">⌄</span>
          </div>
          <p class="field-note">可选：非公开、摘要公开、详情公开、全员可安装。</p>
        </div>

        <div class="field-stack">
          <label class="publish-label" for="publish-changelog">变更说明</label>
          <textarea id="publish-changelog" placeholder="描述本次版本的主要变更内容"></textarea>
        </div>

        <div class="publish-submit-row">
          <button class="primary-button publish-submit-button" type="button">发布 Skill</button>
        </div>
      </div>
    </section>
  `;
}

function renderPublishedSkillActions(skill) {
  if (skill.status === "archived") {
    return `
      <button class="ghost-button" type="button" disabled>已归档</button>
      <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="change-visibility">修改公开级别</button>
    `;
  }

  if (skill.status === "published") {
    return `
      <button class="primary-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="publish-version">发布新版本</button>
      <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="offline">下架</button>
      <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="change-visibility">修改公开级别</button>
    `;
  }

  if (skill.status === "offline") {
    return `
      <button class="primary-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="online">重新上架</button>
      <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="archive">归档</button>
      <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="change-visibility">修改公开级别</button>
    `;
  }

  if (skill.status === "pending_review") {
    return `
      <button class="primary-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="withdraw">撤回待审</button>
      <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="change-visibility">修改公开级别</button>
    `;
  }

  return `
    <button class="primary-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="resubmit">重新提交</button>
    <button class="ghost-button" type="button" data-action="published-skill-action" data-id="${skill.id}" data-op="change-visibility">修改公开级别</button>
  `;
}

function communityMinePane() {
  if (!state.loggedIn) {
    return `
      <section class="stage-panel community-author-panel placeholder-span">
        <div class="placeholder-panel">
          <strong>登录后查看我的发布</strong>
          <p>作者中心需要企业登录，用于查看我发布的 Skill、审核状态与上下架动作。</p>
          <div class="detail-actions">
            <button class="primary-button" type="button" data-action="open-login">登录企业服务</button>
          </div>
        </div>
      </section>
    `;
  }

  const selected = selectedPublishedSkill();
  if (!selected) {
    return `
      <section class="stage-panel community-author-panel placeholder-span">
        <div class="placeholder-panel">
          <strong>还没有发布记录</strong>
          <p>可以先从左侧的“发布”入口提交一个 Skill。</p>
        </div>
      </section>
    `;
  }

  return `
    <div class="community-author-panel placeholder-span">
      <div class="review-layout published-layout">
        <section class="stage-panel review-queue local-list-panel">
          <div class="scroll-area">
            <div class="selection-list">
              ${publishedSkills
                .map(
                  (skill) => `
                    <button
                      class="selection-item ${selected.id === skill.id ? "active" : ""}"
                      type="button"
                      data-action="select-published-skill"
                      data-id="${skill.id}"
                    >
                      <strong>${skill.name}</strong>
                      <p class="muted tiny">${skill.skillId} · ${publishedStatusMeta(skill).label}</p>
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>
        <section class="stage-panel review-preview detail-column">
          <span class="eyebrow">My Skills</span>
          <h3>${selected.name}</h3>
          <p>${selected.description}</p>
          <div class="detail-grid">
            <div class="meta-detail">
              <strong>${selected.skillId}</strong>
              <p>skillID</p>
            </div>
            <div class="meta-detail">
              <strong>${selected.version}</strong>
              <p>当前版本</p>
            </div>
            <div class="meta-detail">
              <strong>${publishedStatusMeta(selected).label}</strong>
              <p>当前状态</p>
            </div>
            <div class="meta-detail">
              <strong>${selected.auditStage}</strong>
              <p>审核阶段</p>
            </div>
            <div class="meta-detail">
              <strong>${selected.scope}</strong>
              <p>授权范围</p>
            </div>
            <div class="meta-detail">
              <strong>${selected.visibility}</strong>
              <p>公开级别</p>
            </div>
            <div class="meta-detail">
              <strong>${formatNumber(selected.downloads)}</strong>
              <p>下载量</p>
            </div>
            <div class="meta-detail">
              <strong>${formatNumber(selected.stars)}</strong>
              <p>Star 数</p>
            </div>
          </div>
          <div class="detail-section">
            <strong>审核意见</strong>
            <p>${selected.reviewNote}</p>
          </div>
          ${selected.rejectReason !== "无" ? `<div class="detail-section"><strong>拒绝原因</strong><p>${selected.rejectReason}</p></div>` : ""}
          <div class="detail-section">
            <strong>版本历史</strong>
            <div class="detail-list">
              ${selected.versionHistory.map((item) => `<div class="detail-list-item">${item}</div>`).join("")}
            </div>
          </div>
          <div class="detail-section">
            <strong>权限变更记录</strong>
            <div class="detail-list">
              ${selected.permissionHistory.map((item) => `<div class="detail-list-item">${item}</div>`).join("")}
            </div>
          </div>
          <div class="detail-actions">
            ${renderPublishedSkillActions(selected)}
          </div>
        </section>
        <aside class="stage-panel review-context detail-column">
          <h3>文件预览</h3>
          <p class="muted">默认选中 SKILL.md，支持在线预览与下载入口说明。</p>
          <div class="meta-strip">
            ${selected.files.map((file) => `<span class="tag-chip">${file}</span>`).join("")}
          </div>
          <div class="code-preview" style="margin-top: 12px;">${escapeHtml(selected.preview)}</div>
        </aside>
      </div>
    </div>
  `;
}

function communityStage() {
  const toolbar = communityToolbarConfig();

  if (state.communityMode === "publish") {
    return `
      <section class="stage-shell community-stage">
        <div class="workspace-grid community-workspace">
          ${communitySwitcher()}
          ${renderWorkspaceToolbar(toolbar)}
          ${communityPublishPane()}
        </div>
      </section>
    `;
  }

  if (state.communityMode === "mine") {
    return `
      <section class="stage-shell community-stage">
        <div class="workspace-grid community-workspace">
          ${communitySwitcher()}
          ${renderWorkspaceToolbar(toolbar)}
          ${communityMinePane()}
        </div>
      </section>
    `;
  }

  if (state.communityMode !== "skills") {
    return `
      <section class="stage-shell community-stage">
        <div class="workspace-grid community-workspace">
          ${communitySwitcher()}
          ${renderWorkspaceToolbar(toolbar)}
          ${communityPlaceholderPane(state.communityMode === "mcp" ? "MCP" : "插件")}
        </div>
      </section>
    `;
  }

  const list = filteredCommunitySkills();
  const leaderboard = communityLeaderboardItems();

  return `
    <section class="stage-shell community-stage">
      <div class="workspace-grid community-workspace">
        ${communitySwitcher()}
        ${renderWorkspaceToolbar(toolbar)}
        <div class="community-main">
          <section class="head-panel stage-panel community-filter-panel">
            <div class="search-sort-row">
              <div class="search-row">
                <input
                  type="search"
                  placeholder="搜索 Skill 名称、描述、作者、部门或标签"
                  value="${escapeHtml(state.communityQuery)}"
                  data-input="community-query"
                />
              </div>
              <select class="sort-select" data-change="community-sort">
                ${[
                  ["recommended", "综合排序"],
                  ["stars", "Star 数"],
                  ["downloads", "下载量"],
                  ["latest", "最近更新"]
                ]
                  .map(
                    ([value, label]) => `
                      <option value="${value}" ${state.communitySort === value ? "selected" : ""}>${label}</option>
                    `
                  )
                  .join("")}
              </select>
            </div>
            <div class="tag-row">
              ${communityTags
                .map(
                  (tag) => `
                    <button
                      class="pill-button ${state.communityTag === tag ? "active" : ""}"
                      type="button"
                      data-action="community-tag"
                      data-tag="${tag}"
                    >
                      ${tag}
                    </button>
                  `
                )
                .join("")}
            </div>
          </section>
          <section class="stage-panel list-panel">
            <div class="scroll-area">
              <div class="skill-grid">
                ${list
                  .map(
                    (skill) => `
                      <button class="skill-market-card" type="button" data-action="open-detail" data-skill="${skill.id}">
                        <div class="skill-market-body">
                          <div class="market-card-head">
                            <div class="market-title-row">
                              ${renderSkillInitial(skill.name, "sm")}
                              <div class="list-row-copy">
                                <strong>${skill.name}</strong>
                                <p>${skill.description}</p>
                              </div>
                            </div>
                            <div class="market-card-meta">
                              <span class="tag-chip">${skill.category}</span>
                              <span class="status-chip ${statusMeta(skill).tone}">${statusMeta(skill).label}</span>
                            </div>
                          </div>
                          <div class="meta-strip">
                            ${skill.tags.map((tag) => `<span class="tag-chip">${tag}</span>`).join("")}
                          </div>
                          <div class="meta-strip">
                            <span class="metric-chip">${skill.author}</span>
                            <span class="metric-chip">${skill.department}</span>
                            <span class="metric-chip">v${skill.version}</span>
                          </div>
                        </div>
                        <div class="metric-row compact align-start">
                          <span class="metric-chip">⭐ ${formatNumber(skill.stars)}</span>
                          <span class="metric-chip">↓ ${formatNumber(skill.downloads)}</span>
                        </div>
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
          </section>
        </div>
        <aside class="stage-panel community-rank-panel home-side-panel">
          <div class="community-rank-header">
            <h3>下载热榜</h3>
          </div>
          <div class="leaderboard-tabs">
            ${[
              ["downloads", "下载"],
              ["stars", "Star"],
              ["trending", "上升"]
            ]
              .map(
                ([value, label]) => `
                  <button
                    class="pill-button ${state.communityLeaderboard === value ? "active" : ""}"
                    type="button"
                    data-action="community-leaderboard"
                    data-mode="${value}"
                  >
                    ${label}
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="home-rank-list">
            ${leaderboard
              .map(
                (skill, index) => `
                  <button class="home-rank-row" type="button" data-action="open-detail" data-skill="${skill.id}">
                    ${renderSkillInitial(skill.name, "md", false, `rank-badge ${rankToneClass(index)}`)}
                    <div class="home-rank-copy">
                      <strong>${skill.name}</strong>
                      <div class="home-rank-meta">
                        <span class="tag-chip">${skill.category}</span>
                        <span class="home-rank-stat">☆ ${formatNumber(skill.stars)}</span>
                        <span class="home-rank-stat">↓ ${formatNumber(skill.downloads)}</span>
                      </div>
                    </div>
                  </button>
                `
              )
              .join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function communitySwitcher() {
  const discoverItems = [
    { id: "skills", label: "Skills", note: "6" },
    { id: "mcp", label: "MCP", note: "预留" },
    { id: "plugins", label: "插件", note: "预留" }
  ];

  const authorItems = [
    { id: "publish", label: "发布" },
    { id: "mine", label: "我的", note: String(publishedSkills.length) }
  ];

  return `
    <aside class="stage-panel side-switcher">
      ${renderSidebarHeader("社", "社区入口")}
      <div class="switcher-list">
        ${discoverItems
          .map(
            (item) => `
              <button
                class="switcher-button ${state.communityMode === item.id ? "active" : ""}"
                type="button"
                data-action="community-mode"
                data-mode="${item.id}"
              >
                <span>${item.label}</span>
                ${renderSwitcherNote(item.note)}
              </button>
            `
          )
          .join("")}
        <div class="switcher-divider"></div>
        ${authorItems
          .map(
            (item) => `
              <button
                class="switcher-button ${state.communityMode === item.id ? "active" : ""}"
                type="button"
                data-action="community-mode"
                data-mode="${item.id}"
              >
                <span>${item.label}</span>
                ${renderSwitcherNote(item.note)}
              </button>
            `
          )
          .join("")}
      </div>
    </aside>
  `;
}

function localSwitcher() {
  const items = [
    { id: "skills", label: "Skills", note: String(getLocalSkills().length) },
    { id: "tools", label: "工具", note: String(tools.length) },
    { id: "projects", label: "项目", note: String(projects.length) }
  ];

  return `
    <aside class="stage-panel side-switcher">
      ${renderSidebarHeader("本", "本地入口")}
      <div class="switcher-list">
        ${items
          .map(
            (item) => `
              <button
                class="switcher-button ${state.localMode === item.id ? "active" : ""}"
                type="button"
                data-action="local-mode"
                data-mode="${item.id}"
              >
                <span>${item.label}</span>
                ${renderSwitcherNote(item.note)}
              </button>
            `
          )
          .join("")}
      </div>
    </aside>
  `;
}

function localRows() {
  const query = state.localQuery.trim().toLowerCase();

  if (state.localMode === "tools") {
    return tools
      .filter((tool) => `${tool.name} ${tool.description} ${tool.path}`.toLowerCase().includes(query || ""))
      .map(
        (tool) => `
          <article
            class="local-item ${state.selectedToolId === tool.id ? "active" : ""}"
            data-action="select-tool"
            data-id="${tool.id}"
          >
            <span class="entity-mark">${entityMark(tool.name)}</span>
            <div class="list-row-copy">
              <strong>${tool.name}</strong>
              <p>${tool.description}</p>
              <div class="meta-strip">
                <span class="metric-chip">${tool.status}</span>
                <span class="metric-chip">Skill ${tool.skills}</span>
                <span class="metric-chip">${tool.path}</span>
              </div>
            </div>
            <div class="skill-side">
              <div class="skill-actions">
                <button class="ghost-button" type="button">重新检测</button>
                <button class="ghost-button" type="button">编辑路径</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  if (state.localMode === "projects") {
    return projects
      .filter((project) => `${project.name} ${project.description} ${project.path}`.toLowerCase().includes(query || ""))
      .map(
        (project) => `
          <article
            class="local-item ${state.selectedProjectId === project.id ? "active" : ""}"
            data-action="select-project"
            data-id="${project.id}"
          >
            <span class="entity-mark soft">${entityMark(project.name)}</span>
            <div class="list-row-copy">
              <strong>${project.name}</strong>
              <p>${project.description}</p>
              <div class="meta-strip">
                <span class="metric-chip">${project.status}</span>
                <span class="metric-chip">Skill ${project.skills}</span>
                <span class="metric-chip">${project.path}</span>
              </div>
            </div>
            <div class="skill-side">
              <div class="skill-actions">
                <button class="ghost-button" type="button">启用管理</button>
                <button class="ghost-button" type="button">查看路径</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  return filteredLocalSkills()
    .map((skill) => {
      const issues = localSkillIssues(skill);
      return `
        <article
          class="local-item ${state.selectedLocalSkillId === skill.id ? "active" : ""}"
          data-action="select-local"
          data-skill="${skill.id}"
        >
          ${renderSkillInitial(skill.name, "md")}
          <div class="list-row-copy">
            <strong>${skill.name}</strong>
            <p>${skill.description}</p>
            <div class="meta-strip">
              <span class="metric-chip">${skill.author}</span>
              <span class="metric-chip">${skill.department}</span>
              <span class="metric-chip">本地 ${skill.localVersion}</span>
              <span class="status-chip ${statusMeta(skill).tone}">${statusMeta(skill).label}</span>
            </div>
            ${issues.length ? `<div class="status-chip warning">${issues[0]}</div>` : ""}
          </div>
          <div class="skill-side">
            <div class="skill-actions">
              <button class="primary-button" type="button" data-action="skill-primary" data-skill="${skill.id}">
                ${skill.state === "update_available" ? "更新" : "启用"}
              </button>
              <button class="ghost-button" type="button" data-action="uninstall-skill" data-skill="${skill.id}">
                卸载
              </button>
            </div>
            <div class="metric-row compact">
              <span class="metric-chip">目标 ${skill.enabledTargets.length}</span>
              <span class="metric-chip">${skill.updatedAt}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function localDetailPanel() {
  const entity = selectedLocalEntity();
  if (!entity) return "";

  if (state.localMode === "tools") {
    return `
      <aside class="stage-panel detail-column">
        <div class="detail-cover">
          <div class="entity-mark" style="width:100%;height:100%;border-radius:8px;font-size:28px;">${entityMark(entity.name)}</div>
        </div>
        <div class="detail-section">
          <span class="eyebrow">当前选中</span>
          <h3>${entity.name}</h3>
          <p>${entity.description}</p>
          <div class="meta-strip">
            <span class="metric-chip">${entity.status}</span>
            <span class="metric-chip">Skill ${entity.skills}</span>
          </div>
        </div>
        <div class="detail-section">
          <strong>路径</strong>
          <p>${entity.path}</p>
        </div>
        <div class="detail-actions">
          <button class="primary-button" type="button">重新扫描</button>
          <button class="ghost-button" type="button">编辑路径</button>
        </div>
      </aside>
    `;
  }

  if (state.localMode === "projects") {
    return `
      <aside class="stage-panel detail-column">
        <div class="detail-cover">
          <div class="entity-mark soft" style="width:100%;height:100%;border-radius:8px;font-size:28px;">${entityMark(entity.name)}</div>
        </div>
        <div class="detail-section">
          <span class="eyebrow">当前选中</span>
          <h3>${entity.name}</h3>
          <p>${entity.description}</p>
          <div class="meta-strip">
            <span class="metric-chip">${entity.status}</span>
            <span class="metric-chip">Skill ${entity.skills}</span>
          </div>
        </div>
        <div class="detail-section">
          <strong>项目路径</strong>
          <p>${entity.path}</p>
        </div>
        <div class="detail-actions">
          <button class="primary-button" type="button">启用管理</button>
          <button class="ghost-button" type="button">查看路径</button>
        </div>
      </aside>
    `;
  }

  return `
    <aside class="stage-panel detail-column">
      <div class="detail-symbol-panel">
        ${renderSkillInitial(entity.name, "xl")}
      </div>
      <div class="detail-section">
        <span class="eyebrow">当前选中</span>
        <h3>${entity.name}</h3>
        <p>${entity.readme}</p>
        <div class="meta-strip">
          <span class="metric-chip">${entity.department}</span>
          <span class="metric-chip">v${entity.version}</span>
          <span class="status-chip ${statusMeta(entity).tone}">${statusMeta(entity).label}</span>
        </div>
      </div>
      <div class="detail-section">
        <strong>已启用位置</strong>
        <div class="meta-strip">
          ${entity.enabledTargets.length ? entity.enabledTargets.map((item) => `<span class="tag-chip">${item}</span>`).join("") : `<span class="tag-chip">暂未启用</span>`}
        </div>
      </div>
      <div class="detail-section">
        <strong>当前提示</strong>
        <p>${localSkillIssues(entity)[0] ?? "点击不同 Skill 时，这里同步切换简介与操作。"} </p>
      </div>
      <div class="detail-actions">
        <button class="primary-button" type="button" data-action="skill-primary" data-skill="${entity.id}">
          ${entity.state === "update_available" ? "更新" : "启用"}
        </button>
        <button class="ghost-button" type="button" data-action="open-detail" data-skill="${entity.id}">查看完整详情</button>
      </div>
    </aside>
  `;
}

function localStage() {
  const hasDetail = Boolean(selectedLocalEntity());
  const subtitle =
    state.localMode === "tools"
      ? "统一查看工具安装路径与 Skills 目录，不再挤占本地主舞台。"
      : state.localMode === "projects"
        ? "项目级路径和启用独立管理，避免与工具配置混在一起。"
        : "把注意力放在已安装 Skill、本机启用状态、更新窗口和异常摘要上。";

  return `
    <section class="stage-shell local-stage">
      <div class="workspace-grid local-workspace">
        ${localSwitcher()}
        ${renderWorkspaceToolbar(localToolbarConfig())}
        <div class="local-main">
          <div class="local-browser ${hasDetail ? "has-detail" : ""}">
            <section class="stage-panel local-list-panel">
              <div class="search-sort-row">
                <div class="search-row">
                  <input
                    type="search"
                    placeholder="${state.localMode === "skills" ? "搜索本地 Skill、异常摘要或 skillID" : state.localMode === "tools" ? "搜索工具名称或安装路径" : "搜索项目名称或项目路径"}"
                    value="${escapeHtml(state.localQuery)}"
                    data-input="local-query"
                  />
                </div>
                ${
                  state.localMode === "skills"
                    ? `
                      <select class="sort-select" data-change="local-filter">
                        ${localFilters
                          .map(
                            (filter) => `
                              <option value="${filter}" ${state.localFilter === filter ? "selected" : ""}>${filter}</option>
                            `
                          )
                          .join("")}
                      </select>
                    `
                    : `<div class="metric-row compact"><span class="metric-chip">${state.localMode === "tools" ? "工具视图" : "项目视图"}</span></div>`
                }
              </div>
              <div class="scroll-area" style="margin-top: 16px;">
                <div class="selection-list">
                  ${localRows()}
                </div>
              </div>
            </section>
            ${hasDetail ? localDetailPanel() : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}

function manageStage() {
  const content = state.manageTab === "departments"
    ? departmentsPane()
    : state.manageTab === "users"
      ? usersPane()
      : state.manageTab === "skills"
        ? skillsPane()
        : reviewsPane();

  return `
    <section class="stage-shell manage-stage">
      <div class="workspace-grid manage-workspace">
        <aside class="stage-panel side-switcher">
          ${renderSidebarHeader("管", "管理入口")}
          <div class="switcher-list">
            ${[
              { id: "reviews", label: "审核", note: String(reviews.length) },
              { id: "skills", label: "Skills", note: String(skills.length) },
              { id: "departments", label: "部门", note: String(departments.length) },
              { id: "users", label: "用户", note: String(users.length) }
            ]
              .map(
                (item) => `
                  <button
                  class="switcher-button ${state.manageTab === item.id ? "active" : ""}"
                  type="button"
                  data-action="manage-tab"
                  data-tab="${item.id}"
                >
                  <span>${item.label}</span>
                  ${renderSwitcherNote(item.note)}
                </button>
            `
          )
              .join("")}
          </div>
        </aside>
        ${renderWorkspaceToolbar(manageToolbarConfig())}
        <div class="manage-main">${content}</div>
      </div>
    </section>
  `;
}

function departmentsPane() {
  const selected = getDepartmentById(state.selectedDepartmentId) ?? departments[0];
  const metrics = manageDepartmentMetrics(selected);
  const directChildren = getDepartmentChildren(selected.id);
  const directUsers = getDepartmentUsers(selected.id, false);
  const directManagers = getDepartmentManagers(selected.id);
  const departmentState = departmentStatusMeta(selected);
  const canEdit = selected.level > 0;
  const canDelete = selected.level > 0 && directChildren.length === 0 && directUsers.length === 0;

  const contentRows =
    state.manageDepartmentView === "children"
      ? directChildren.length
        ? directChildren
            .map((department) => {
              const childMetrics = manageDepartmentMetrics(department);
              const tone = departmentStatusMeta(department);
              return `
                <button class="manage-data-row" type="button" data-action="select-department" data-id="${department.id}">
                  <div class="manage-data-row-main">
                    ${renderSkillInitial(department.name, "sm")}
                    <div>
                      <strong>${department.name}</strong>
                      <p>${department.path}</p>
                    </div>
                  </div>
                  <div class="manage-data-row-meta">
                    <span class="status-chip ${tone.tone}">${tone.label}</span>
                    <small>${childMetrics.users} 人</small>
                    <small>${department.skillCount} Skills</small>
                  </div>
                </button>
              `;
            })
            .join("")
        : `
            <div class="manage-empty-card">
              <strong>当前没有下级部门</strong>
              <p>可以从右侧 Inspector 或顶部主按钮新增下级部门，继续扩展组织结构。</p>
            </div>
          `
      : state.manageDepartmentView === "users"
        ? directUsers.length
          ? directUsers
              .map((user) => `
                <button class="manage-data-row" type="button" data-action="select-user" data-id="${user.id}">
                  <div class="manage-data-row-main">
                    ${renderSkillInitial(user.displayName, "sm")}
                    <div>
                      <strong>${user.displayName}</strong>
                      <p>${user.username} · ${userRoleLabel(user)}</p>
                    </div>
                  </div>
                  <div class="manage-data-row-meta">
                    <span class="status-chip ${userStatusMeta(user).tone}">${userStatusMeta(user).label}</span>
                    <small>已发布 ${user.published}</small>
                    <small>☆ ${user.stars}</small>
                  </div>
                </button>
              `)
              .join("")
          : `
              <div class="manage-empty-card">
                <strong>当前部门还没有直接归属用户</strong>
                <p>如果需要在该节点开户，可以从顶部“新增用户”或右侧动作区进入。</p>
              </div>
            `
        : selected.featuredSkills.length
          ? selected.featuredSkills
              .map(
                (skill) => `
                  <article class="manage-data-row static-row">
                    <div class="manage-data-row-main">
                      ${renderSkillInitial(skill.name, "sm")}
                      <div>
                        <strong>${skill.name}</strong>
                        <p>${skill.owner}</p>
                      </div>
                    </div>
                    <div class="manage-data-row-meta">
                      <span class="metric-chip">${skill.status}</span>
                    </div>
                  </article>
                `
              )
              .join("")
          : `
              <div class="manage-empty-card">
                <strong>当前没有可展示的 Skills</strong>
                <p>这个节点仍可保留部门结构，用于后续分配成员与权限范围。</p>
              </div>
            `;

  return `
    <div class="manage-hub manage-hub-departments">
      <section class="stage-panel manage-tree-panel">
        <div class="manage-panel-toolbar">
          <div class="search-row">
            <input
              type="search"
              placeholder="搜索部门名称、路径或职责"
              value="${escapeHtml(state.manageDepartmentQuery)}"
              data-input="manage-department-query"
            />
          </div>
          <div class="meta-strip">
            <span class="metric-chip">我的范围 ${departments.length} 个部门</span>
            <span class="metric-chip">管理员 ${users.filter((user) => user.role === "admin").length} 名</span>
          </div>
        </div>
        <div class="scroll-area">
          <div class="department-tree-list">
            ${getVisibleDepartmentTree()
              .map(({ department, depth, hasChildren, isCollapsed }) => {
                const metrics = manageDepartmentMetrics(department);
                const meta = departmentStatusMeta(department);
                return `
                  <div class="department-tree-row ${selected.id === department.id ? "active" : ""}" style="--tree-depth:${depth};">
                    <button
                      class="tree-branch-button ${!hasChildren ? "placeholder" : ""}"
                      type="button"
                      data-action="${hasChildren ? "toggle-department-branch" : "select-department"}"
                      data-id="${department.id}"
                      ${hasChildren ? "" : 'aria-hidden="true"'}
                    >
                      ${hasChildren ? (isCollapsed ? "+" : "−") : "·"}
                    </button>
                    <button class="tree-select-button" type="button" data-action="select-department" data-id="${department.id}">
                      <div class="tree-select-main">
                        ${renderSkillInitial(department.name, "sm")}
                        <div>
                          <strong>${department.name}</strong>
                          <p>${department.path}</p>
                        </div>
                      </div>
                      <div class="tree-select-meta">
                        <span class="status-chip ${meta.tone}">${meta.label}</span>
                        <small>${metrics.users} 人</small>
                      </div>
                    </button>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </section>

      <section class="stage-panel manage-center-panel">
        <div class="manage-panel-head">
          <div class="section-copy">
            <span class="eyebrow">当前部门</span>
            <h3>${selected.name}</h3>
            <p>${selected.summary}</p>
          </div>
          <div class="meta-strip">
            <span class="metric-chip">${selected.path}</span>
            <span class="metric-chip">${selected.scopeLabel}</span>
            <span class="status-chip ${departmentState.tone}">${departmentState.label}</span>
          </div>
        </div>

        <div class="manage-metrics-grid">
          <article class="manage-metric-card">
            <span>直属下级</span>
            <strong>${metrics.directChildren}</strong>
            <small>可继续扩展组织层级</small>
          </article>
          <article class="manage-metric-card">
            <span>范围用户</span>
            <strong>${metrics.users}</strong>
            <small>本部门及所有后代部门</small>
          </article>
          <article class="manage-metric-card">
            <span>直属管理员</span>
            <strong>${metrics.managers}</strong>
            <small>每个部门至少一名管理员</small>
          </article>
          <article class="manage-metric-card">
            <span>Skill 数</span>
            <strong>${metrics.skills}</strong>
            <small>用于权限与审核治理</small>
          </article>
        </div>

        <div class="manage-subtabs">
          ${manageDepartmentViews
            .map(
              (view) => `
                <button
                  class="pill-button ${state.manageDepartmentView === view.id ? "active" : ""}"
                  type="button"
                  data-action="manage-department-view"
                  data-view="${view.id}"
                >
                  ${view.label}
                </button>
              `
            )
            .join("")}
        </div>

        <div class="manage-list-header">
          <strong>${
            state.manageDepartmentView === "children"
              ? "直属下级部门"
              : state.manageDepartmentView === "users"
                ? "本部门用户"
                : "部门 Skills 概览"
          }</strong>
          <small>${
            state.manageDepartmentView === "children"
              ? "在结构树中定位和维护节点，而不是平铺成普通列表。"
              : state.manageDepartmentView === "users"
                ? "成员列表与账号治理分离，避免右侧 Inspector 被表单挤占。"
                : "这里展示与当前部门最相关的已发布或在审 Skills。"
          }</small>
        </div>

        <div class="scroll-area">
          <div class="manage-data-list">
            ${contentRows}
          </div>
        </div>
      </section>

      <aside class="stage-panel manage-inspector-panel">
        <div class="detail-symbol-panel manage-symbol-panel">
          ${renderSkillInitial(selected.name, "xl")}
        </div>
        <div class="detail-section">
          <span class="eyebrow">Inspector</span>
          <h3>${selected.name}</h3>
          <p>${selected.note}</p>
          <div class="meta-strip">
            <span class="metric-chip">L${selected.level}</span>
            <span class="metric-chip">${selected.path}</span>
          </div>
        </div>
        <div class="detail-grid">
          <div class="meta-detail">
            <strong>${countSubtreeAdmins(selected.id)}</strong>
            <p>范围管理员</p>
          </div>
          <div class="meta-detail">
            <strong>${getDepartmentUsers(selected.id).length}</strong>
            <p>范围成员</p>
          </div>
          <div class="meta-detail">
            <strong>${selected.skillCount}</strong>
            <p>治理对象</p>
          </div>
          <div class="meta-detail">
            <strong>${departmentState.label}</strong>
            <p>当前状态</p>
          </div>
        </div>
        <div class="detail-section">
          <strong>当前部门管理员</strong>
          <div class="detail-list">
            ${directManagers.length
              ? directManagers
                  .map((manager) => `<div class="detail-list-item">${manager.displayName} · ${userRoleLabel(manager)}</div>`)
                  .join("")
              : `<div class="detail-list-item">暂未分配管理员</div>`}
          </div>
        </div>
        <div class="detail-section">
          <strong>规则提醒</strong>
          <div class="detail-list">
            <div class="detail-list-item">可查询本部门及所有后代部门。</div>
            <div class="detail-list-item">仅可修改、删除后代部门，本部门和上级部门只读。</div>
            <div class="detail-list-item">删除前必须确保节点为空，且不会移除最后一个管理员。</div>
          </div>
        </div>
        <div class="detail-actions">
          <button class="primary-button" type="button" data-action="open-drawer" data-drawer="create-department">新增下级部门</button>
          <button class="ghost-button" type="button" data-action="manage-department-view" data-view="users">查看用户</button>
          <button class="ghost-button" type="button" ${canEdit ? "" : "disabled"}>重命名</button>
        </div>
        <div class="danger-panel">
          <strong>危险区</strong>
          <p>${canDelete ? "当前节点为空，可执行删除。" : "当前节点不可删除。根节点只读；非空节点需要先清空下级部门和直属用户。"}</p>
          <button class="ghost-button danger" type="button" ${canDelete ? "" : "disabled"}>删除部门</button>
        </div>
      </aside>
    </div>
  `;
}

function usersPane() {
  const filteredUsers = filteredManageUsers();
  const selected = selectedManageUsers();
  const activeUsers = filteredUsers.filter((user) => user.status === "active").length;
  const frozenUsers = filteredUsers.filter((user) => user.status === "frozen").length;

  return `
    <div class="manage-hub manage-hub-users">
      <section class="stage-panel manage-center-panel">
        <div class="manage-panel-toolbar stack">
          <div class="search-row">
            <input
              type="search"
              placeholder="搜索用户名、显示名、部门路径"
              value="${escapeHtml(state.manageUserQuery)}"
              data-input="manage-user-query"
            />
          </div>
          <div class="manage-filter-groups">
            <div class="filter-group">
              ${manageRoleFilters
                .map(
                  (filter) => `
                    <button
                      class="pill-button ${state.manageUserRoleFilter === filter.id ? "active" : ""}"
                      type="button"
                      data-action="manage-user-role-filter"
                      data-value="${filter.id}"
                    >
                      ${filter.label}
                    </button>
                  `
                )
                .join("")}
            </div>
            <div class="filter-group">
              ${manageStatusFilters
                .map(
                  (filter) => `
                    <button
                      class="pill-button ${state.manageUserStatusFilter === filter.id ? "active" : ""}"
                      type="button"
                      data-action="manage-user-status-filter"
                      data-value="${filter.id}"
                    >
                      ${filter.label}
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="meta-strip">
            <span class="metric-chip">当前结果 ${filteredUsers.length}</span>
            <span class="metric-chip">正常 ${activeUsers}</span>
            <span class="metric-chip">冻结 ${frozenUsers}</span>
          </div>
        </div>

        <div class="scroll-area">
          <div class="manage-data-list manage-user-list">
            ${filteredUsers.length
              ? filteredUsers
                  .map((user) => {
                    const department = getUserDepartment(user);
                    const status = userStatusMeta(user);
                    return `
                      <button class="manage-user-row ${selected?.id === user.id ? "active" : ""}" type="button" data-action="select-user" data-id="${user.id}">
                        <div class="manage-data-row-main">
                          ${renderSkillInitial(user.displayName, "sm")}
                          <div>
                            <strong>${user.displayName}</strong>
                            <p>${user.username} · ${department?.path ?? "-"}</p>
                          </div>
                        </div>
                        <div class="manage-user-stats">
                          <span class="status-chip ${status.tone}">${status.label}</span>
                          <small>${userRoleLabel(user)}</small>
                          <small>已发布 ${user.published}</small>
                          <small>☆ ${user.stars}</small>
                          <small>${user.lastLogin}</small>
                        </div>
                      </button>
                    `;
                  })
                  .join("")
              : `
                  <div class="manage-empty-card">
                    <strong>没有匹配到用户</strong>
                    <p>可以放宽筛选条件，或从顶部主按钮创建一个新的演示账号。</p>
                  </div>
                `}
          </div>
        </div>
      </section>

      <aside class="stage-panel manage-inspector-panel">
        ${
          selected
            ? (() => {
                const department = getUserDepartment(selected);
                const status = userStatusMeta(selected);
                const canMutate = selected.adminLevel !== 1;
                const relatedSkills = (department?.featuredSkills ?? []).slice(0, 2);
                return `
                  <div class="detail-symbol-panel manage-symbol-panel">
                    ${renderSkillInitial(selected.displayName, "xl")}
                  </div>
                  <div class="detail-section">
                    <span class="eyebrow">当前选中</span>
                    <h3>${selected.displayName}</h3>
                    <p>${selected.summary}</p>
                    <div class="meta-strip">
                      <span class="status-chip ${status.tone}">${status.label}</span>
                      <span class="metric-chip">${userRoleLabel(selected)}</span>
                      <span class="metric-chip">${department?.name ?? "-"}</span>
                    </div>
                  </div>
                  <div class="detail-grid">
                    <div class="meta-detail">
                      <strong>${selected.published}</strong>
                      <p>已发布 Skill</p>
                    </div>
                    <div class="meta-detail">
                      <strong>${selected.stars}</strong>
                      <p>Star 数</p>
                    </div>
                    <div class="meta-detail">
                      <strong>${selected.lastLogin}</strong>
                      <p>最近登录</p>
                    </div>
                    <div class="meta-detail">
                      <strong>${department?.path ?? "-"}</strong>
                      <p>所属部门</p>
                    </div>
                  </div>
                  <div class="detail-section">
                    <strong>发布概览</strong>
                    <div class="detail-list">
                      ${
                        relatedSkills.length
                          ? relatedSkills.map((skill) => `<div class="detail-list-item">${skill.name} · ${skill.status}</div>`).join("")
                          : `<div class="detail-list-item">暂无可展示的发布记录</div>`
                      }
                    </div>
                  </div>
                  <div class="detail-section">
                    <strong>账号动作</strong>
                    <p>${selected.status === "frozen" ? "解冻后可恢复登录和会话续期。" : "冻结后立即使现有会话失效，并隐藏管理入口。"}</p>
                  </div>
                  <div class="detail-actions">
                    <button class="primary-button" type="button" data-action="demo-user-action" data-op="toggle-role" data-id="${selected.id}" ${canMutate ? "" : "disabled"}>
                      ${selected.role === "admin" ? "设为普通用户" : "设为管理员"}
                    </button>
                    <button class="ghost-button" type="button" data-action="demo-user-action" data-op="toggle-freeze" data-id="${selected.id}" ${canMutate ? "" : "disabled"}>
                      ${selected.status === "frozen" ? "解冻账号" : "冻结账号"}
                    </button>
                  </div>
                  <div class="danger-panel">
                    <strong>危险区</strong>
                    <p>${canMutate ? "删除用户会移除该账号的管理关系；已发布 Skill 不自动迁移。" : "一级管理员账号仅用于演示根权限，不提供删除。"} </p>
                    <button class="ghost-button danger" type="button" data-action="demo-user-action" data-op="delete" data-id="${selected.id}" ${canMutate ? "" : "disabled"}>删除用户</button>
                  </div>
                `;
              })()
            : `
                <div class="manage-empty-card">
                  <strong>选择一个用户查看详情</strong>
                  <p>右侧 Inspector 会展示角色、状态、发布概览和危险动作。</p>
                </div>
              `
        }
      </aside>
    </div>
  `;
}

function skillsPane() {
  const selected = getSkill(state.selectedManagedSkillId) ?? skills[0];
  return `
    <div class="manage-layout">
      <section class="stage-panel manage-side local-list-panel">
        <div class="scroll-area">
          <div class="selection-list">
            ${skills
              .map(
                (skill) => `
                  <button
                    class="selection-item ${selected.id === skill.id ? "active" : ""}"
                    type="button"
                    data-action="select-managed-skill"
                    data-id="${skill.id}"
                  >
                    <strong>${skill.name}</strong>
                    <p class="muted tiny">${skill.department} · ${statusMeta(skill).label}</p>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="stage-panel manage-detail detail-column">
        <div class="detail-symbol-panel">
          ${renderSkillInitial(selected.name, "xl")}
        </div>
        <span class="eyebrow">Skills</span>
        <h3>${selected.name}</h3>
        <p>${selected.description}</p>
        <div class="detail-grid">
          <div class="meta-detail">
            <strong>${selected.author}</strong>
            <p>发布者</p>
          </div>
          <div class="meta-detail">
            <strong>${selected.department}</strong>
            <p>发布部门</p>
          </div>
          <div class="meta-detail">
            <strong>${formatNumber(selected.downloads)}</strong>
            <p>下载量</p>
          </div>
          <div class="meta-detail">
            <strong>${formatNumber(selected.stars)}</strong>
            <p>Star 数</p>
          </div>
        </div>
        <div class="detail-actions">
          <button class="primary-button" type="button" data-action="open-detail" data-skill="${selected.id}">查看完整详情</button>
          <button class="ghost-button" type="button">下架</button>
          <button class="ghost-button" type="button">归档</button>
        </div>
      </section>
    </div>
  `;
}

function reviewsPane() {
  const selected = reviews.find((item) => item.id === state.selectedReviewId) ?? reviews[0];
  return `
    <div class="review-layout">
      <section class="stage-panel review-queue local-list-panel">
        <div class="scroll-area">
          <div class="selection-list">
            ${reviews
              .map(
                (review) => `
                  <button
                    class="selection-item ${selected.id === review.id ? "active" : ""}"
                    type="button"
                    data-action="select-review"
                    data-id="${review.id}"
                  >
                    <strong>${review.name}</strong>
                    <p class="muted tiny">${review.submitter} · ${review.type}</p>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
      <section class="stage-panel review-preview detail-column">
        <span class="eyebrow">Review</span>
        <h3>${selected.name}</h3>
        <p>${selected.summary}</p>
        <div class="detail-grid">
          <div class="meta-detail">
            <strong>${selected.submitter}</strong>
            <p>提交人</p>
          </div>
          <div class="meta-detail">
            <strong>${selected.department}</strong>
            <p>提交部门</p>
          </div>
          <div class="meta-detail">
            <strong>${selected.type}</strong>
            <p>单据类型</p>
          </div>
          <div class="meta-detail">
            <strong>${selected.risk}</strong>
            <p>风险等级</p>
          </div>
        </div>
        <div class="detail-actions">
          <button class="primary-button" type="button">同意发布</button>
          <button class="ghost-button" type="button">退回修改</button>
          <button class="ghost-button" type="button">拒绝</button>
        </div>
      </section>
      <aside class="stage-panel review-context detail-column">
        <h3>文件预览</h3>
        <p class="muted">默认选中 SKILL.md，按右侧上下文完成审核决策。</p>
        <div class="code-preview">${escapeHtml(selected.preview)}</div>
      </aside>
    </div>
  `;
}

function skillDetailStage() {
  const skill = state.detailPageSkillId ? getSkill(state.detailPageSkillId) : null;
  if (!skill) return homeStage();

  const sourceStage = stageLabel(state.detailPageSourceStage);

  return `
    <section class="stage-shell skill-detail-stage">
      <section class="head-panel stage-panel">
        <div class="stage-heading">
          <div>
            <div class="detail-breadcrumb">
              <button class="ghost-button" type="button" data-action="close-skill-page">返回${sourceStage}</button>
              <span class="metric-chip">独立详情页</span>
            </div>
            <span class="eyebrow">Skill Detail</span>
            <h1>${skill.name}</h1>
            <p>${skill.description}</p>
          </div>
          <div class="detail-actions">
            <button class="primary-button" type="button" data-action="skill-primary" data-skill="${skill.id}">
              ${primaryActionLabel(skill)}
            </button>
            <button class="ghost-button" type="button" data-action="request-auth" data-auth="star" data-skill="${skill.id}">
              收藏
            </button>
          </div>
        </div>
      </section>

      <div class="skill-detail-layout">
        <section class="stage-panel skill-detail-main">
          <div class="detail-symbol-panel detail-symbol-panel-stage">
            ${renderSkillInitial(skill.name, "xl")}
          </div>
          <div class="detail-grid">
            <div class="meta-detail">
              <strong>${formatNumber(skill.stars)}</strong>
              <p>Star 数</p>
            </div>
            <div class="meta-detail">
              <strong>${formatNumber(skill.downloads)}</strong>
              <p>下载量</p>
            </div>
            <div class="meta-detail">
              <strong>${skill.compatibleTools.length}</strong>
              <p>兼容工具</p>
            </div>
            <div class="meta-detail">
              <strong>${skill.updatedAt}</strong>
              <p>最近变化</p>
            </div>
          </div>
          <div class="detail-section">
            <strong>能力说明</strong>
            <p>${skill.readme}</p>
          </div>
          <div class="detail-section">
            <strong>兼容工具</strong>
            <div class="meta-strip">
              ${skill.compatibleTools.map((tool) => `<span class="tag-chip">${tool}</span>`).join("")}
            </div>
          </div>
        </section>

        <aside class="stage-panel skill-detail-side detail-column">
          <div class="detail-section">
            <span class="eyebrow">概要</span>
            <div class="meta-strip">
              <span class="metric-chip">${skill.author}</span>
              <span class="metric-chip">${skill.department}</span>
              <span class="metric-chip">v${skill.version}</span>
              <span class="status-chip ${statusMeta(skill).tone}">${statusMeta(skill).label}</span>
            </div>
          </div>
          <div class="detail-section">
            <strong>已启用位置</strong>
            <div class="meta-strip">
              ${skill.enabledTargets.length ? skill.enabledTargets.map((item) => `<span class="tag-chip">${item}</span>`).join("") : `<span class="tag-chip">暂未启用</span>`}
            </div>
          </div>
          <div class="detail-section">
            <strong>当前提示</strong>
            <p>${localSkillIssues(skill)[0] ?? "当前 Skill 可从这里进入启用、收藏和卸载等动作。"} </p>
          </div>
          <div class="detail-actions">
            <button class="primary-button" type="button" data-action="skill-primary" data-skill="${skill.id}">
              ${primaryActionLabel(skill)}
            </button>
            ${skill.localVersion ? `<button class="ghost-button" type="button" data-action="uninstall-skill" data-skill="${skill.id}">卸载</button>` : ""}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderStage() {
  if (state.detailPageSkillId) {
    stageMount.innerHTML = skillDetailStage();
    return;
  }

  if (state.activeStage === "community") {
    stageMount.innerHTML = communityStage();
    return;
  }

  if (state.activeStage === "local") {
    stageMount.innerHTML = localStage();
    return;
  }

  if (state.activeStage === "manage" && isAdminVisible()) {
    stageMount.innerHTML = manageStage();
    return;
  }

  stageMount.innerHTML = homeStage();
}

function renderNotifications() {
  if (state.menu !== "notifications") return "";

  return `
    <div class="topbar-popover">
      <div class="section-copy">
        <strong>通知</strong>
        <p>审核进度、Skill 更新和发布提醒会集中在这里。</p>
      </div>
      <div class="popover-list">
        ${notifications
          .map(
            (item) => `
              <button class="popover-row" type="button" data-action="notification-jump" data-target="${item.target}">
                <span class="avatar-dot">${item.unread ? "新" : "已"}</span>
                <div class="list-row-copy">
                  <strong>${item.title}</strong>
                  <p>${item.summary}</p>
                </div>
                <small>${item.time}</small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderAvatarMenu() {
  if (state.menu !== "avatar") return "";

  if (!state.loggedIn) {
    return `
      <div class="topbar-popover">
        <div class="section-copy">
          <strong>访客模式</strong>
          <p>需要市场、发布或治理动作时，再登录同步企业服务。</p>
        </div>
        <div class="menu-stack">
          <button class="menu-entry" type="button" data-action="open-login">登录</button>
          <button class="menu-entry" type="button" data-action="open-settings">设置</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="topbar-popover">
      <div class="section-copy">
        <strong>${state.user.name}</strong>
        <p>${state.user.department}</p>
      </div>
      <div class="menu-stack">
        <button class="menu-entry" type="button" data-action="logout">退出登录</button>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-stack">
        <button class="menu-entry" type="button" data-action="open-settings">设置</button>
      </div>
    </div>
  `;
}

function renderScopeWindow() {
  const skill = state.scopeSkillId ? getSkill(state.scopeSkillId) : null;
  if (!skill) return "";

  const readOnly = skill.state === "restricted";
  const targets = getScopeTargets(skill);

  return `
    <div class="backdrop" data-action="close-scope"></div>
    <div class="modal-shell">
      <section class="modal-panel scope-panel">
        <div class="modal-head">
          <div class="section-copy">
            <span class="eyebrow">目标选择</span>
            <h3>${skill.name} v${skill.version}</h3>
          </div>
          <button class="close-button" type="button" data-action="close-scope">关闭</button>
        </div>
        <div class="section-stack" style="margin-top: 18px;">
          <div class="meta-strip">
            <span class="metric-chip">当前已启用 ${state.scopeDraft.length}</span>
            <span class="status-chip ${statusMeta(skill).tone}">${statusMeta(skill).label}</span>
          </div>
          ${readOnly ? `<div class="status-chip warning">权限已收缩，当前版本可查看启用位置，但不可新增或移除目标。</div>` : ""}
          <div class="scope-target-grid">
            ${targets
              .map(
                (target) => `
                  <button
                    class="scope-target-button ${target.selected ? "active" : ""} ${!target.available ? "disabled" : ""}"
                    type="button"
                    data-action="toggle-scope-target"
                    data-target="${escapeHtml(target.value)}"
                    ${!target.available || readOnly ? "disabled" : ""}
                  >
                    <div class="scope-target-head">
                      <span class="scope-check ${target.selected ? "active" : ""}"></span>
                      <strong>${target.title}</strong>
                    </div>
                    <p>${target.path}</p>
                    <span class="scope-target-subtitle">${target.subtitle}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="action-row">
            <button class="primary-button" type="button" data-action="save-scope" ${readOnly ? "disabled" : ""}>应用目标</button>
            <button class="ghost-button" type="button">添加自定义工具</button>
            <button class="ghost-button" type="button">添加项目</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderDepartmentOptions(selectedId = state.selectedDepartmentId) {
  return departments
    .map((department) => {
      const prefix = department.level ? `${"— ".repeat(department.level)}` : "";
      return `
        <option value="${department.id}" ${selectedId === department.id ? "selected" : ""}>
          ${prefix}${department.path}
        </option>
      `;
    })
    .join("");
}

function renderCreateDepartmentDrawer() {
  return `
    <div class="sheet-backdrop" data-action="close-drawer"></div>
    <div class="sheet-shell">
      <aside class="sheet-panel">
        <div class="modal-head">
          <div class="section-copy">
            <h3>新增下级部门</h3>
            <p>演示版里把创建动作收进抽屉，避免长期占用右侧 Inspector。</p>
          </div>
          <button class="close-button" type="button" data-action="close-drawer">关闭</button>
        </div>
        <div class="sheet-scroll">
          <form class="drawer-form" data-form="create-demo-department">
            <div class="field-stack">
              <label for="drawer-parent-department">父部门</label>
              <select id="drawer-parent-department" name="parentId">
                ${renderDepartmentOptions(state.selectedDepartmentId)}
              </select>
            </div>
            <div class="field-stack">
              <label for="drawer-department-name">部门名称</label>
              <input id="drawer-department-name" name="name" placeholder="例如：智能工作流组" />
            </div>
            <div class="field-stack">
              <label for="drawer-department-summary">职责摘要</label>
              <textarea id="drawer-department-summary" name="summary" rows="4" placeholder="描述该部门负责的技能、项目或治理范围"></textarea>
            </div>
            <div class="detail-list">
              <div class="detail-list-item">创建后默认处于 active 状态，但仍需补齐管理员。</div>
              <div class="detail-list-item">根节点不可修改；这里只创建当前选中节点的下级部门。</div>
            </div>
            <div class="action-row">
              <button class="primary-button" type="submit">创建部门</button>
              <button class="ghost-button" type="button" data-action="close-drawer">取消</button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  `;
}

function renderCreateUserDrawer() {
  const defaultDepartmentId = selectedManageUsers()?.departmentId ?? state.selectedDepartmentId;
  return `
    <div class="sheet-backdrop" data-action="close-drawer"></div>
    <div class="sheet-shell">
      <aside class="sheet-panel">
        <div class="modal-head">
          <div class="section-copy">
            <h3>新增用户</h3>
            <p>账号创建从常驻表单改为抽屉式动作，日常治理优先给搜索、筛选和详情联动留空间。</p>
          </div>
          <button class="close-button" type="button" data-action="close-drawer">关闭</button>
        </div>
        <div class="sheet-scroll">
          <form class="drawer-form" data-form="create-demo-user">
            <div class="field-stack">
              <label for="drawer-username">用户名</label>
              <input id="drawer-username" name="username" placeholder="例如：new_admin" />
            </div>
            <div class="field-stack">
              <label for="drawer-display-name">显示名</label>
              <input id="drawer-display-name" name="displayName" placeholder="例如：新成员" />
            </div>
            <div class="field-stack">
              <label for="drawer-user-department">所属部门</label>
              <select id="drawer-user-department" name="departmentId">
                ${renderDepartmentOptions(defaultDepartmentId)}
              </select>
            </div>
            <div class="detail-grid">
              <label class="field-stack">
                <span>角色</span>
                <select name="role">
                  <option value="normal_user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </label>
              <label class="field-stack">
                <span>管理员等级</span>
                <input name="adminLevel" value="4" />
              </label>
            </div>
            <div class="detail-list">
              <div class="detail-list-item">冻结用户后会立即使现有会话失效。</div>
              <div class="detail-list-item">角色只能被提升到低于当前管理员的等级，演示版默认创建为 L4。</div>
            </div>
            <div class="action-row">
              <button class="primary-button" type="submit">创建用户</button>
              <button class="ghost-button" type="button" data-action="close-drawer">取消</button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  `;
}

function renderDrawer() {
  if (!state.drawer) return "";

  if (state.drawer === "create-user") return renderCreateUserDrawer();
  if (state.drawer === "create-department") return renderCreateDepartmentDrawer();

  const titleMap = {
    tools: "工具管理",
    projects: "项目管理",
    diagnostics: "诊断"
  };

  const items = state.drawer === "tools" ? tools : state.drawer === "projects" ? projects : diagnostics;

  return `
    <div class="sheet-backdrop" data-action="close-drawer"></div>
    <div class="sheet-shell">
      <aside class="sheet-panel">
        <div class="modal-head">
          <div class="section-copy">
            <h3>${titleMap[state.drawer]}</h3>
            <p>${
              state.drawer === "tools"
                ? "保留轻量入口，避免本地页被工具配置挤占。"
                : state.drawer === "projects"
                  ? "项目路径和启用集中在抽屉里处理。"
                  : "把异常和冲突留在抽屉中查看，不抢占本地主舞台。"
            }</p>
          </div>
          <button class="close-button" type="button" data-action="close-drawer">关闭</button>
        </div>
        <div class="sheet-scroll">
          <div class="selection-list">
            ${items
              .map((item) => {
                if (state.drawer === "diagnostics") {
                  return `
                    <article class="selection-item">
                      <strong>${item.title}</strong>
                      <p class="muted">${item.summary}</p>
                    </article>
                  `;
                }

                return `
                  <article class="selection-item">
                    <strong>${item.name}</strong>
                    <p class="muted">${item.path}</p>
                    <div class="meta-strip" style="margin-top: 10px;">
                      <span class="metric-chip">${item.status}</span>
                      <span class="metric-chip">Skill ${item.skills}</span>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
        </div>
      </aside>
    </div>
  `;
}

function renderSettings() {
  if (!state.settingsOpen) return "";

  return `
    <div class="backdrop" data-action="close-settings"></div>
    <div class="modal-shell">
      <section class="settings-panel">
        <div class="modal-head">
          <div class="section-copy">
            <span class="eyebrow">Settings</span>
            <h3>设置</h3>
            <p>保留主题、语言和偏好入口，通过头像菜单进入，不占用一级导航。</p>
          </div>
          <button class="close-button" type="button" data-action="close-settings">关闭</button>
        </div>
        <div class="settings-grid">
          <div class="settings-card">
            <strong>主题</strong>
            <p class="muted" style="margin-top: 8px;">深色模式与浅色模式都遵循同一套玻璃材质和轻边框语言。</p>
            <div class="theme-picker">
              <button class="theme-option ${state.theme === "dark" ? "active" : ""}" type="button" data-action="theme" data-theme="dark">
                <strong>Midnight Dark</strong>
                <p class="muted">纯黑背景，蓝青高亮。</p>
              </button>
              <button class="theme-option ${state.theme === "light" ? "active" : ""}" type="button" data-action="theme" data-theme="light">
                <strong>Studio Light</strong>
                <p class="muted">铝灰背景，柔和阴影。</p>
              </button>
            </div>
          </div>
          <div class="settings-card">
            <strong>常规</strong>
            <p class="muted" style="margin-top: 8px;">语言、同步和本地偏好保留在这里，减少导航层级。</p>
            <div class="settings-grid" style="grid-template-columns: 1fr; margin-top: 14px;">
              <div class="field-stack">
                <label for="language-select">语言</label>
                <select class="settings-select" id="language-select">
                  <option>简体中文</option>
                  <option>English</option>
                </select>
              </div>
              <div class="field-stack">
                <label>同步策略</label>
                <div class="meta-strip">
                  <span class="status-chip success">启动时同步</span>
                  <span class="metric-chip">本地优先</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderLogin() {
  if (!state.loginOpen) return "";

  return `
    <div class="backdrop" data-action="close-login"></div>
    <div class="modal-shell">
      <section class="modal-panel">
        <div class="modal-head">
          <div class="section-copy">
            <span class="eyebrow">Sign In</span>
            <h3>连接企业服务</h3>
            <p>登录后即可继续发布、安装、收藏和管理员治理动作。</p>
          </div>
          <button class="close-button" type="button" data-action="close-login">关闭</button>
        </div>
        <form class="login-form" data-form="login">
          <div class="field-stack">
            <label for="login-username">用户名</label>
            <input id="login-username" name="username" value="${escapeHtml(state.loginForm.username)}" placeholder="输入企业账号" />
          </div>
          <div class="field-stack">
            <label for="login-password">密码</label>
            <input id="login-password" name="password" type="password" value="${escapeHtml(state.loginForm.password)}" placeholder="输入密码" />
          </div>
          <div class="action-row">
            <button class="primary-button" type="submit">登录</button>
            <button class="ghost-button" type="button" data-action="close-login">取消</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderFloating() {
  floatingMount.className = "overlay-root";
  floatingMount.innerHTML = `
    ${renderNotifications()}
    ${renderAvatarMenu()}
    ${renderScopeWindow()}
    ${renderDrawer()}
    ${renderSettings()}
    ${renderLogin()}
  `;
}

function render() {
  if (state.activeStage === "manage" && !isAdminVisible()) {
    state.activeStage = "home";
  }

  if (state.detailPageSkillId && !getSkill(state.detailPageSkillId)) {
    closeSkillDetailPage();
  }

  if (state.scopeSkillId && !getSkill(state.scopeSkillId)) {
    closeScopeWindow();
  }

  if (state.selectedPublishedSkillId && !getPublishedSkill(state.selectedPublishedSkillId)) {
    state.selectedPublishedSkillId = publishedSkills[0]?.id ?? null;
  }

  if (state.selectedLocalSkillId && !getLocalSkills().some((skill) => skill.id === state.selectedLocalSkillId)) {
    state.selectedLocalSkillId = null;
  }

  if (state.selectedDepartmentId && !departments.some((department) => department.id === state.selectedDepartmentId)) {
    state.selectedDepartmentId = departments[0]?.id ?? null;
  }

  if (state.selectedUserId && !users.some((user) => user.id === state.selectedUserId)) {
    state.selectedUserId = users[0]?.id ?? null;
  }

  if (state.selectedToolId && !tools.some((tool) => tool.id === state.selectedToolId)) state.selectedToolId = null;
  if (state.selectedProjectId && !projects.some((project) => project.id === state.selectedProjectId)) state.selectedProjectId = null;

  document.body.classList.toggle("theme-dark", state.theme === "dark");
  document.body.classList.toggle("theme-light", state.theme === "light");
  renderNav();
  renderTopbar();
  renderStage();
  renderFloating();
}

function toggleSkillPrimary(skillId) {
  const skill = getSkill(skillId);
  if (!skill) return;

  if (!state.loggedIn) {
    state.pendingAction = { type: "skill-primary", skillId };
    state.loginOpen = true;
    state.menu = null;
    render();
    return;
  }

  if (!skill.localVersion) {
    skill.localVersion = skill.version;
    skill.state = "installed";
    state.localMode = "skills";
    state.selectedLocalSkillId = skill.id;
    openScopeWindow(skillId);
  } else if (skill.state === "update_available") {
    skill.localVersion = skill.version;
    skill.state = skill.enabledTargets.length ? "enabled" : "installed";
    state.localMode = "skills";
    state.selectedLocalSkillId = skill.id;
  } else {
    openScopeWindow(skillId);
  }

  render();
}

function uninstallSkill(skillId) {
  const skill = getSkill(skillId);
  if (!skill) return;
  skill.localVersion = null;
  skill.enabledTargets = [];
  skill.state = "not_installed";
  if (state.detailSkillId === skillId) state.detailSkillId = null;
  if (state.detailPageSkillId === skillId) closeSkillDetailPage();
  if (state.scopeSkillId === skillId) closeScopeWindow();
  render();
}

function nextPublishedVisibility(value) {
  if (value === "非公开") return "摘要公开";
  if (value === "摘要公开") return "详情公开";
  if (value === "详情公开") return "全员可安装";
  return "非公开";
}

function mutatePublishedSkill(skillId, operation) {
  const skill = getPublishedSkill(skillId);
  if (!skill) return;

  if (operation === "publish-version") {
    openPublishPage();
    render();
    return;
  }

  if (operation === "offline") {
    skill.status = "offline";
    skill.auditStage = "已下架";
    skill.reviewNote = "当前版本已下架，等待新的发布版本重新提交。";
    skill.versionHistory = [`${skill.version} · 已下架 · 刚刚`, ...skill.versionHistory];
  }

  if (operation === "archive") {
    skill.status = "archived";
    skill.auditStage = "已归档";
    skill.reviewNote = "该 Skill 已归档，仅保留历史记录与文件预览。";
    skill.versionHistory = [`${skill.version} · 已归档 · 刚刚`, ...skill.versionHistory];
  }

  if (operation === "online") {
    skill.status = "published";
    skill.auditStage = "重新上架";
    skill.reviewNote = "已重新上架，延续当前权限范围与公开级别。";
    skill.versionHistory = [`${skill.version} · 重新上架 · 刚刚`, ...skill.versionHistory];
  }

  if (operation === "withdraw") {
    skill.status = "withdrawn";
    skill.auditStage = "已撤回";
    skill.reviewNote = "作者已撤回当前提交，可补充说明后重新提交。";
    skill.versionHistory = [`${skill.version} · 已撤回待审 · 刚刚`, ...skill.versionHistory];
  }

  if (operation === "resubmit") {
    skill.status = "pending_review";
    skill.auditStage = "重新提交审核";
    skill.reviewNote = "已重新进入审核链路，等待管理员处理。";
    skill.versionHistory = [`${skill.version} · 重新提交审核 · 刚刚`, ...skill.versionHistory];
  }

  if (operation === "change-visibility") {
    skill.visibility = nextPublishedVisibility(skill.visibility);
    skill.permissionHistory = [`${skill.visibility} · 权限已调整 · 刚刚`, ...skill.permissionHistory];
  }

  render();
}

function mutateDemoUser(userId, operation) {
  const user = users.find((item) => item.id === userId);
  if (!user) return;

  if (operation === "toggle-freeze" && user.adminLevel !== 1) {
    user.status = user.status === "frozen" ? "active" : "frozen";
  }

  if (operation === "toggle-role" && user.adminLevel !== 1) {
    if (user.role === "admin") {
      user.role = "normal_user";
      user.adminLevel = null;
    } else {
      user.role = "admin";
      user.adminLevel = 4;
    }
  }

  if (operation === "delete" && user.adminLevel !== 1) {
    const index = users.findIndex((item) => item.id === userId);
    if (index >= 0) users.splice(index, 1);
  }

  render();
}

function requestAuth(type, skillId = null) {
  if (type === "publish") {
    openPublishPage();
    render();
    return;
  }

  if (state.loggedIn) {
    if (type === "star" && skillId) {
      const skill = getSkill(skillId);
      if (skill) skill.stars += 1;
    }
    render();
    return;
  }

  state.pendingAction = { type, skillId };
  state.loginOpen = true;
  state.menu = null;
  render();
}

function completePendingAction() {
  if (!state.pendingAction) return;
  const { type, skillId } = state.pendingAction;
  state.pendingAction = null;

  if (type === "publish") {
    openPublishPage();
    return;
  }

  if (type === "star" && skillId) {
    const skill = getSkill(skillId);
    if (skill) skill.stars += 1;
    return;
  }

  if (type === "skill-primary" && skillId) {
    toggleSkillPrimary(skillId);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    const insidePopover = event.target.closest(".topbar-popover");
    const trigger = event.target.closest(".menu-button");
    if (!insidePopover && !trigger && state.menu) {
      state.menu = null;
      render();
    }
    return;
  }

  const action = target.dataset.action;

  if (action === "stage") {
    state.activeStage = target.dataset.stage;
    closeSkillDetailPage();
    closePublishPage();
    state.menu = null;
  }

  if (action === "stage-local-mode") {
    state.activeStage = "local";
    state.localMode = target.dataset.mode;
    selectDefaultLocalEntity(state.localMode);
    closeSkillDetailPage();
    closePublishPage();
    state.menu = null;
  }

  if (action === "stage-manage-tab") {
    state.activeStage = "manage";
    state.manageTab = target.dataset.tab;
    closeSkillDetailPage();
    closePublishPage();
    state.menu = null;
  }

  if (action === "open-publish-page") {
    openPublishPage();
    render();
    return;
  }

  if (action === "toggle-menu") {
    state.menu = state.menu === target.dataset.menu ? null : target.dataset.menu;
  }

  if (action === "community-mode") {
    state.communityMode = target.dataset.mode;
  }

  if (action === "community-tag") {
    state.communityTag = target.dataset.tag;
  }

  if (action === "community-leaderboard") {
    state.communityLeaderboard = target.dataset.mode;
  }

  if (action === "open-detail") {
    openSkillDetailPage(target.dataset.skill);
  }

  if (action === "close-skill-page") {
    closeSkillDetailPage();
  }

  if (action === "close-publish-page") {
    closePublishPage();
  }

  if (action === "close-detail") {
    state.detailSkillId = null;
  }

  if (action === "open-drawer") {
    state.drawer = target.dataset.drawer;
  }

  if (action === "close-drawer") {
    state.drawer = null;
  }

  if (action === "close-scope") {
    closeScopeWindow();
  }

  if (action === "local-mode") {
    state.localMode = target.dataset.mode;
    selectDefaultLocalEntity(state.localMode);
  }

  if (action === "open-settings") {
    state.settingsOpen = true;
    state.menu = null;
  }

  if (action === "close-settings") {
    state.settingsOpen = false;
  }

  if (action === "open-login") {
    state.loginOpen = true;
    state.menu = null;
  }

  if (action === "close-login") {
    state.loginOpen = false;
  }

  if (action === "theme") {
    state.theme = target.dataset.theme;
  }

  if (action === "request-auth") {
    requestAuth(target.dataset.auth, target.dataset.skill);
    return;
  }

  if (action === "logout") {
    state.loggedIn = false;
    state.user = { name: "访客", department: "本地模式", isAdmin: false };
    state.menu = null;
    state.activeStage = state.activeStage === "manage" ? "home" : state.activeStage;
  }

  if (action === "skill-primary") {
    toggleSkillPrimary(target.dataset.skill);
    return;
  }

  if (action === "uninstall-skill") {
    uninstallSkill(target.dataset.skill);
    return;
  }

  if (action === "select-local") {
    state.selectedLocalSkillId = target.dataset.skill;
  }

  if (action === "select-tool") {
    state.selectedToolId = target.dataset.id;
  }

  if (action === "select-project") {
    state.selectedProjectId = target.dataset.id;
  }

  if (action === "manage-tab") {
    state.manageTab = target.dataset.tab;
  }

  if (action === "toggle-department-branch") {
    const targetId = target.dataset.id;
    if (state.collapsedDepartmentIds.includes(targetId)) {
      state.collapsedDepartmentIds = state.collapsedDepartmentIds.filter((id) => id !== targetId);
    } else {
      state.collapsedDepartmentIds = [...state.collapsedDepartmentIds, targetId];
    }
    render();
    return;
  }

  if (action === "manage-department-view") {
    state.manageDepartmentView = target.dataset.view;
  }

  if (action === "manage-user-role-filter") {
    state.manageUserRoleFilter = target.dataset.value;
  }

  if (action === "manage-user-status-filter") {
    state.manageUserStatusFilter = target.dataset.value;
  }

  if (action === "toggle-scope-target") {
    const skill = state.scopeSkillId ? getSkill(state.scopeSkillId) : null;
    if (skill?.state === "restricted") {
      render();
      return;
    }

    const value = target.dataset.target;
    if (state.scopeDraft.includes(value)) {
      state.scopeDraft = state.scopeDraft.filter((item) => item !== value);
    } else {
      state.scopeDraft = [...state.scopeDraft, value];
    }
  }

  if (action === "save-scope") {
    const skill = state.scopeSkillId ? getSkill(state.scopeSkillId) : null;
    if (skill && skill.state !== "restricted") {
      skill.enabledTargets = [...state.scopeDraft];
      skill.state = skill.enabledTargets.length ? "enabled" : "installed";
    }
    closeScopeWindow();
  }

  if (action === "select-department") {
    state.selectedDepartmentId = target.dataset.id;
  }

  if (action === "select-user") {
    state.manageTab = state.manageTab === "departments" ? "users" : state.manageTab;
    state.selectedUserId = target.dataset.id;
  }

  if (action === "select-managed-skill") {
    state.selectedManagedSkillId = target.dataset.id;
  }

  if (action === "select-review") {
    state.selectedReviewId = target.dataset.id;
  }

  if (action === "select-published-skill") {
    state.selectedPublishedSkillId = target.dataset.id;
  }

  if (action === "published-skill-action") {
    mutatePublishedSkill(target.dataset.id, target.dataset.op);
    return;
  }

  if (action === "demo-user-action") {
    mutateDemoUser(target.dataset.id, target.dataset.op);
    return;
  }

  if (action === "notification-jump") {
    state.activeStage = target.dataset.target;
    closeSkillDetailPage();
    closePublishPage();
    state.menu = null;
  }

  render();
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-input='community-query']")) {
    state.communityQuery = event.target.value;
    render();
  }

  if (event.target.matches("[data-input='local-query']")) {
    state.localQuery = event.target.value;
    render();
  }

  if (event.target.matches("[data-input='manage-department-query']")) {
    state.manageDepartmentQuery = event.target.value;
    render();
  }

  if (event.target.matches("[data-input='manage-user-query']")) {
    state.manageUserQuery = event.target.value;
    render();
  }

  if (event.target.id === "login-username") {
    state.loginForm.username = event.target.value;
  }

  if (event.target.id === "login-password") {
    state.loginForm.password = event.target.value;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-change='community-sort']")) {
    state.communitySort = event.target.value;
    render();
  }

  if (event.target.matches("[data-change='local-filter']")) {
    state.localFilter = event.target.value;
    render();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  if (form.dataset.form === "home-search") {
    const query = new FormData(form).get("query");
    state.communityQuery = typeof query === "string" ? query : "";
    state.activeStage = "community";
    render();
    return;
  }

  if (form.dataset.form === "login") {
    const username = (new FormData(form).get("username") || "").toString().trim();
    state.loggedIn = true;
    state.loginOpen = false;
    state.loginForm.password = "";
    state.user = {
      name: username || "Lin Aurora",
      department: username.toLowerCase().includes("design") ? "产品设计部" : "平台研发部",
      isAdmin: username.toLowerCase().includes("admin") || username.toLowerCase().includes("lin")
    };
    completePendingAction();
    render();
    return;
  }

  if (form.dataset.form === "create-demo-user") {
    const formData = new FormData(form);
    const username = (formData.get("username") || "").toString().trim();
    const displayName = (formData.get("displayName") || "").toString().trim();
    const departmentId = (formData.get("departmentId") || "").toString();
    const role = (formData.get("role") || "normal_user").toString();
    const adminLevel = Number((formData.get("adminLevel") || "4").toString() || "4");
    if (!username || !displayName || !departmentId) {
      render();
      return;
    }

    const newId = `user-${Date.now()}`;
    users.unshift({
      id: newId,
      displayName,
      username,
      departmentId,
      role,
      adminLevel: role === "admin" ? adminLevel : null,
      status: "active",
      published: 0,
      stars: 0,
      lastLogin: "刚创建",
      summary: "新创建的演示账号，可继续调整角色与冻结状态。"
    });
    state.drawer = null;
    state.selectedUserId = newId;
    state.manageTab = "users";
    render();
    return;
  }

  if (form.dataset.form === "create-demo-department") {
    const formData = new FormData(form);
    const parentId = (formData.get("parentId") || "").toString();
    const name = (formData.get("name") || "").toString().trim();
    const summary = (formData.get("summary") || "").toString().trim();
    const parent = getDepartmentById(parentId);
    if (!parent || !name) {
      render();
      return;
    }

    const newId = `dept-${Date.now()}`;
    departments.push({
      id: newId,
      parentId,
      name,
      path: `${parent.path}/${name}`,
      level: parent.level + 1,
      status: "draft",
      scopeLabel: `${name} 待分配管理范围`,
      summary: summary || "新建部门，等待补齐管理员、成员与技能范围。",
      note: "这是演示版中新创建的部门节点，可继续分配用户和下级组织。",
      skillCount: 0,
      featuredSkills: []
    });
    state.collapsedDepartmentIds = state.collapsedDepartmentIds.filter((id) => id !== parentId);
    state.drawer = null;
    state.selectedDepartmentId = newId;
    state.manageTab = "departments";
    state.manageDepartmentView = "children";
    render();
    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (state.detailSkillId) {
    state.detailSkillId = null;
  } else if (state.drawer) {
    state.drawer = null;
  } else if (state.settingsOpen) {
    state.settingsOpen = false;
  } else if (state.loginOpen) {
    state.loginOpen = false;
  } else if (state.menu) {
    state.menu = null;
  }

  render();
});

render();
