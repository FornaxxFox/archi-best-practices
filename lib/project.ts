export const projectPrinciples = [
  {
    index: "01",
    title: "先理解，再生成",
    body: "ArchLens 不把建筑研究压缩成一张漂亮的效果图。我们先保留原始材料、来源和上下文，再把设计判断拆成可阅读、可比较、可复用的结构。",
    action: "每条结论都要能回到一个项目、一条来源或一个明确的编辑判断。",
  },
  {
    index: "02",
    title: "把案例当作方法",
    body: "案例不是风格图鉴，而是解决问题的方法记录。我们关注它如何回应场地、组织公共性、处理材料和承担风险。",
    action: "案例资料卡同时呈现理念、策略、元素、适用条件和不可复制之处。",
  },
  {
    index: "03",
    title: "开放给人的工具，也开放给 Agent",
    body: "网站服务设计师的阅读和判断，MCP 服务外部 Agent 的检索和上下文获取。两者共享同一份结构化知识，不绑定任何模型供应商。",
    action: "优先建设稳定 schema、来源追踪和可下载资料包，再扩展更复杂的 AI 工作流。",
  },
  {
    index: "04",
    title: "把内容生产变成共同建设",
    body: "真正的壁垒不是一次性生成，而是持续累积一套可信的案例生产机制。任何人都可以提出 Wish List、提交案例或改进 Skill。",
    action: "用 GitHub Issue、PR、Skill 和 CI 把贡献路径做成公开协议。",
  },
];

export const projectTracks = [
  { label: "内容任务", title: "建立可追溯的案例库", body: "从知名建筑、城市和规划案例开始，补齐原始来源、设计理念、空间策略、元素、材料、颜色和局限。" },
  { label: "产品任务", title: "让研究在三分钟内开始", body: "用短 Prompt、任务模板、快速筛选、案例对比和资料包下载，把第一次使用的门槛降到最低。" },
  { label: "基础设施任务", title: "提供稳定的 MCP 知识入口", body: "让 Claude、Cursor 或其他 Agent 可以检索案例、获取结构化资料、比较项目并继续完成自己的工作。" },
  { label: "社区任务", title: "形成可持续的开放协作", body: "通过案例生产 Skill、Wish List 和 GitHub 模板，把内容维护从个人劳动变成可复用的社区流程。" },
];

export const projectExpectations = [
  { label: "对设计师", body: "更快找到真正相关的参考，更准确地说明一个方案为什么成立。" },
  { label: "对研究者", body: "把零散的项目网页、图像和文字整理成可引用、可比较的研究材料。" },
  { label: "对 Agent 开发者", body: "提供干净、开放、可组合的建筑知识上下文，而不是一个封闭的聊天产品。" },
];

export const milestones = [
  { phase: "M0", status: "已完成", title: "可演示的内容入口", summary: "验证 ArchLens 的核心阅读体验和产品边界。", deliverables: ["桌面端中文界面", "Mobbin 式案例库", "首批 18 个精选案例", "本地收藏、评分与 Wish List"] },
  { phase: "M1", status: "已完成首个闭环", title: "内容生产与资料包", summary: "让每个案例从展示内容升级为可下载、可复用的研究资产。", deliverables: ["补齐案例背景与研究问题", "统一 case.json / Markdown / README", "完善来源、署名与许可字段", "网站与 MCP 共用资料包生成器", "零依赖 case:pack CLI 与模板"] },
  { phase: "M2", status: "已完成 Demo 闭环", title: "MCP 稳定化", summary: "把案例资料变成可被外部 Agent 稳定调用的公共知识入口。", deliverables: ["服务 0.2.0 / schema 1.0.0", "JSON-RPC 错误、限流与请求观测", "公开 Demo Endpoint 与远程 smoke 验证", "Claude / Cursor 远程 HTTP 配置示例", "可选 Bearer 鉴权与运行时限流配置"] },
  { phase: "M3", status: "当前", title: "开放协作与内容增长", summary: "让更多建筑师、研究者和学生参与案例建设，并让来源处理可以复用。", deliverables: ["GitHub 案例提交与 Wish List", "CI 自动检查来源和 schema", "贡献者指南与编辑规范", "零依赖来源 intake 与目录级 pipeline", "持续扩展建筑 / 规划 / 景观案例"] },
  { phase: "M4", status: "进行中", title: "生产级知识基础设施", summary: "在保持开放和可追溯的前提下，接入更多资料来源。", deliverables: ["来源 intake 与可配置抓取边界", "D1 证据登记、审核状态与事件", "D1 限流 bucket 与内存 fallback", "顺序 source:ingest 与失败门禁", "逐案例哈希、数据集版本与变更记录", "可移交 workspace snapshot", "operator-token D1 共享工作区", "editor/viewer 成员 token、过期与审计", "按操作类型和角色区分的配额策略", "鉴权、配额与团队空间", "可选的用户自有模型工作流"] },
];

export const codeMap = [
  { path: "app/ArchLensApp.tsx", label: "产品界面", body: "研究入口、案例库、工作区、项目说明和 MCP Playground。" },
  { path: "lib/workspace.ts", label: "工作区快照", body: "校验带数据集版本的收藏、评分和最近研究任务，可通过文件安全交接。" },
  { path: "app/api/workspaces/route.ts", label: "共享工作区 API", body: "可选的 D1 空间读写接口，默认关闭并要求独立 operator token。" },
  { path: "lib/workspace-rate-limit.ts", label: "工作区配额", body: "按空间身份、操作类型和成员角色使用 D1 quota bucket，超过配额返回可重试的 429，缺少 migration 时 fail-closed。" },
  { path: "lib/workspace-invite.ts", label: "共享邀请链接", body: "将一次性返回的成员 token 放入 URL fragment，由工作区页面在用户操作后同步并继续走服务端鉴权。" },
  { path: "lib/data.ts", label: "案例知识", body: "案例资料卡、任务模板和 MCP 工具展示元数据。" },
  { path: "lib/mcp.ts", label: "MCP 领域层", body: "工具定义、案例检索、结构化提取、比较和资料包生成。" },
  { path: "app/api/mcp/route.ts", label: "MCP HTTP 接口", body: "无鉴权 Demo Endpoint，承接 initialize、tools/list 和 tools/call。" },
  { path: "scripts/source-intake.mjs", label: "来源 intake", body: "按 HTTPS、超时和字节上限读取公开页面元数据与短摘录，不下载图片或生成事实。" },
  { path: ".github/workflows/source-intake.yml", label: "来源同步工作流", body: "手动触发顺序抓取、证据登记和人工发布候选，失败证据上传但不会自动修改数据集。" },
  { path: "skills/case-production/SKILL.md", label: "案例生产 Skill", body: "规定采集、结构化、引用核验和发布的复用流程。" },
  { path: "workflows/templates/", label: "研究工作流", body: "提供设计思路、元素颜色和案例比较的短 Prompt 与只读 MCP 编排模板。" },
  { path: "docs/", label: "项目文档", body: "理念、架构、Milestones 和开源协作约定。" },
];
