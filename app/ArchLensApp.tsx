"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { cases, findCase, mcpTools, taskTemplates, type CaseStudy } from "@/lib/data";
import { codeMap, milestones, projectExpectations, projectPrinciples, projectTracks } from "@/lib/project";
import { buildResearchPack } from "@/lib/research-pack";
import { buildWorkspaceSnapshot, parseWorkspaceSnapshot, type LastResearch } from "@/lib/workspace";
import { parseWorkspaceInviteFragment, type WorkspaceInvite } from "@/lib/workspace-invite";

type View = "home" | "cases" | "boards" | "project" | "mcp";
type Props = { initialView?: View };

const navItems: { id: View; label: string; path: string }[] = [
  { id: "home", label: "研究入口", path: "/" },
  { id: "cases", label: "案例库", path: "/cases" },
  { id: "boards", label: "工作区", path: "/boards" },
  { id: "project", label: "项目", path: "/project" },
  { id: "mcp", label: "MCP", path: "/mcp" },
];

function downloadText(filename: string, content: string, type = "text/plain") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function mcpExampleInput(name: string) {
  if (name === "get_case" || name === "extract_design_elements" || name === "build_research_pack") return `{"case_id":"${cases[0].id}"}`;
  if (name === "compare_cases" || name === "build_case_collection") return `{"case_ids":["${cases[0].id}","${cases[3].id}"]}`;
  if (name === "list_case_facets") return "{}";
  if (name === "match_cases_to_brief") return '{"brief":"公共空间与自然通风","limit":4}';
  return '{"query":"公共性"}';
}

export default function ArchLensApp({ initialView = "home" }: Props) {
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [regionFilter, setRegionFilter] = useState("全部");
  const [selected, setSelected] = useState<CaseStudy | null>(null);
  const [template, setTemplate] = useState(taskTemplates[0].id);
  const [researchPrompt, setResearchPrompt] = useState(taskTemplates[0].prompt);
  const [saved, setSaved] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [lastResearch, setLastResearch] = useState<LastResearch | null>(null);
  const [toast, setToast] = useState("");
  const [wishList, setWishList] = useState("");
  const [wishSent, setWishSent] = useState(false);
  const [mcpTool, setMcpTool] = useState("search_cases");
  const [mcpInput, setMcpInput] = useState('{"query":"公共性"}');
  const [mcpOutput, setMcpOutput] = useState("选择一个工具并执行真实 MCP 调用。\n\nEndpoint: /api/mcp");
  const [mcpBusy, setMcpBusy] = useState(false);
  const [sharedInvite, setSharedInvite] = useState<WorkspaceInvite | null>(null);
  const [sharedSyncBusy, setSharedSyncBusy] = useState(false);
  const workspaceFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSaved(JSON.parse(localStorage.getItem("archlens-saved") ?? "[]") as string[]);
        setRatings(JSON.parse(localStorage.getItem("archlens-ratings") ?? "{}") as Record<string, number>);
        const storedResearch = JSON.parse(localStorage.getItem("archlens-last-research") ?? "null") as LastResearch | null;
        if (storedResearch && typeof storedResearch.template === "string" && typeof storedResearch.prompt === "string" && typeof storedResearch.createdAt === "string") setLastResearch(storedResearch);
        const incomingInvite = parseWorkspaceInviteFragment(window.location.hash);
        if (incomingInvite) {
          setSharedInvite(incomingInvite);
          sessionStorage.setItem("archlens-invite-fragment", window.location.hash);
          window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
        } else {
          const storedInvite = sessionStorage.getItem("archlens-invite-fragment");
          if (storedInvite) setSharedInvite(parseWorkspaceInviteFragment(storedInvite));
        }
      } catch {
        setToast("本地工作区读取失败，已使用空白工作区");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(""), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [toast]);

  const filteredCases = useMemo(() => cases.filter((item) => {
    const haystack = [item.title, item.architect, item.location, item.typology, item.short, item.context, item.principle, item.strategy, item.materialNotes, ...(item.researchQuestions ?? []), ...item.tags].filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (typeFilter === "全部" || item.projectType === typeFilter) && (regionFilter === "全部" || item.region === regionFilter);
  }), [query, typeFilter, regionFilter]);

  const navigate = (next: View, path: string) => {
    window.history.pushState({}, "", path);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem("archlens-saved", JSON.stringify(next));
    setToast(saved.includes(id) ? "已从工作区移除" : "已保存到工作区");
  };

  const rateCase = (id: string, rating: number) => {
    const next = { ...ratings, [id]: rating };
    setRatings(next);
    localStorage.setItem("archlens-ratings", JSON.stringify(next));
    setToast("评分已保存在本地工作区");
  };

  const chooseTemplate = (id: string) => {
    const item = taskTemplates.find((entry) => entry.id === id) ?? taskTemplates[0];
    setTemplate(item.id);
    setResearchPrompt(item.prompt);
    setToast(`已载入模板：${item.label}`);
  };

  const prepareResearch = () => {
    const nextResearch = { template, prompt: researchPrompt, createdAt: new Date().toISOString() };
    setLastResearch(nextResearch);
    localStorage.setItem("archlens-last-research", JSON.stringify(nextResearch));
    setToast("研究任务已准备好，可复制到你的 MCP 客户端");
    navigate("boards", "/boards");
  };

  const exportWorkspace = () => {
    try {
      const snapshot = buildWorkspaceSnapshot(saved, ratings, lastResearch);
      downloadText(`archlens-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot, null, 2), "application/json");
      setToast("工作区快照已导出，可交给团队或提交到自己的仓库");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "工作区导出失败");
    }
  };

  const importWorkspace = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const snapshot = parseWorkspaceSnapshot(await file.text());
      const availableCaseIds = snapshot.savedCaseIds.filter((id) => Boolean(findCase(id)));
      const availableRatings = Object.fromEntries(Object.entries(snapshot.ratings).filter(([id]) => Boolean(findCase(id))));
      setSaved(availableCaseIds);
      setRatings(availableRatings);
      setLastResearch(snapshot.lastResearch);
      localStorage.setItem("archlens-saved", JSON.stringify(availableCaseIds));
      localStorage.setItem("archlens-ratings", JSON.stringify(availableRatings));
      if (snapshot.lastResearch) localStorage.setItem("archlens-last-research", JSON.stringify(snapshot.lastResearch));
      else localStorage.removeItem("archlens-last-research");
      const ignored = snapshot.savedCaseIds.length - availableCaseIds.length;
      setToast(ignored ? `工作区已导入，${ignored} 个当前数据集不存在的案例已忽略` : `工作区已导入（数据集 ${snapshot.datasetVersion}）`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "工作区导入失败");
    }
  };

  const syncSharedWorkspace = async () => {
    if (!sharedInvite) return;
    setSharedSyncBusy(true);
    try {
      const response = await fetch(`/api/workspaces?id=${encodeURIComponent(sharedInvite.spaceId)}`, { headers: { Authorization: `Bearer ${sharedInvite.token}` } });
      const payload = await response.json() as { space?: { name?: string; snapshot?: unknown }; error?: string };
      if (!response.ok || !payload.space?.snapshot) throw new Error(payload.error ?? "共享工作区同步失败");
      const snapshot = parseWorkspaceSnapshot(payload.space.snapshot);
      const availableCaseIds = snapshot.savedCaseIds.filter((id) => Boolean(findCase(id)));
      const availableRatings = Object.fromEntries(Object.entries(snapshot.ratings).filter(([id]) => Boolean(findCase(id))));
      setSaved(availableCaseIds);
      setRatings(availableRatings);
      setLastResearch(snapshot.lastResearch);
      localStorage.setItem("archlens-saved", JSON.stringify(availableCaseIds));
      localStorage.setItem("archlens-ratings", JSON.stringify(availableRatings));
      if (snapshot.lastResearch) localStorage.setItem("archlens-last-research", JSON.stringify(snapshot.lastResearch));
      else localStorage.removeItem("archlens-last-research");
      setToast(`已同步共享空间：${payload.space.name ?? sharedInvite.spaceId}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "共享工作区同步失败");
    } finally {
      setSharedSyncBusy(false);
    }
  };

  const clearSharedInvite = () => {
    sessionStorage.removeItem("archlens-invite-fragment");
    setSharedInvite(null);
    setToast("已清除共享工作区邀请");
  };

  const submitWishList = () => {
    const params = new URLSearchParams({ template: "wish-list.yml", title: "[Wish List] ", body: wishList ? `## 需求\n${wishList}` : "" });
    window.open(`https://github.com/YiJing233/archlens/issues/new?${params.toString()}`, "_blank", "noopener,noreferrer");
    setWishSent(true);
    setWishList("");
    setToast("已打开 GitHub Wish List 提交页");
  };

  const downloadPack = (item: CaseStudy) => {
    const pack = buildResearchPack(item);
    downloadText(`${pack.filename}.md`, pack.markdown, "text/markdown");
    downloadText(`${item.id}-case.json`, JSON.stringify(pack.json, null, 2), "application/json");
    downloadText(`${item.id}-README.md`, pack.readme, "text/markdown");
    setToast("研究资料包已生成 3 个可复用文件");
  };

  const executeMcp = async () => {
    setMcpBusy(true);
    try {
      const parsed = JSON.parse(mcpInput) as Record<string, unknown>;
      const response = await fetch("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name: mcpTool, arguments: parsed } }) });
      const payload = await response.json() as { result?: { structuredContent?: unknown; content?: { text?: string }[] }; error?: unknown };
      setMcpOutput(JSON.stringify(payload.result?.structuredContent ?? payload.result?.content ?? payload.error ?? payload, null, 2));
    } catch (error) {
      setMcpOutput(error instanceof Error ? error.message : "请求失败");
    } finally {
      setMcpBusy(false);
    }
  };

  const renderNav = () => <header className="topbar"><button className="brand" onClick={() => navigate("home", "/")}><span className="brand-mark">A</span><span>ArchLens</span><span className="brand-slash">/</span><span className="brand-cn">建筑透镜</span></button><nav>{navItems.map((item) => <button className={view === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => navigate(item.id, item.path)}>{item.label}{item.id === "mcp" && <span className="nav-status">LIVE</span>}</button>)}</nav><div className="top-actions"><span className="open-source"><i /> 开源 Demo</span><button className="icon-button" aria-label="搜索" onClick={() => navigate("cases", "/cases")}>⌕</button><a className="github-button" href="https://github.com/YiJing233/archlens" target="_blank" rel="noreferrer">GitHub ↗</a></div></header>;

  const renderHero = () => <section className="hero"><div className="eyebrow"><span className="eyebrow-dot" /> ARCHITECTURAL PRECEDENT LIBRARY <span className="eyebrow-line" /></div><h1>让每个案例，<em>都能被读懂。</em></h1><p className="hero-copy">ArchLens 是一套面向建筑研究的开放案例资料库。检索原始材料，拆解设计逻辑，把值得复用的判断带回你的下一个方案。</p><div className="research-box"><div className="research-label"><span className="prompt-symbol">/</span><span>研究任务</span><span className="research-source">基于公开案例资料 · 不提供官方 AI 推理</span></div><textarea value={researchPrompt} onChange={(event) => setResearchPrompt(event.target.value)} aria-label="研究任务内容" /><div className="research-footer"><span className="research-footnote">你的 MCP 客户端可以直接读取这些案例与结构化字段</span><button className="primary-button" onClick={prepareResearch}>准备研究任务 <span>→</span></button></div></div></section>;

  const renderTemplateRow = () => <section className="template-section"><div className="section-kicker">QUICK START / 01</div><div className="section-head"><h2>从一个好问题开始</h2><span className="section-note">点击模板，快速试用 ArchLens 的核心能力</span></div><div className="template-grid">{taskTemplates.slice(0, 5).map((item, index) => <button className={template === item.id ? "template-card selected" : "template-card"} key={item.id} onClick={() => chooseTemplate(item.id)}><span className="template-index">0{index + 1}</span><span className="template-label">{item.label}</span><span className="template-hint">{item.hint}</span><span className="template-arrow">↗</span></button>)}</div></section>;

  const renderCard = (item: CaseStudy) => <article className="case-card" key={item.id} onClick={() => setSelected(item)}><div className="case-visual" style={{ background: item.gradient }}><img src={item.image} alt={`${item.title} 公开来源图片`} loading="lazy" /><span className="case-number">{String(cases.indexOf(item) + 1).padStart(2, "0")}</span><button className={saved.includes(item.id) ? "save-button saved" : "save-button"} aria-label={saved.includes(item.id) ? "从工作区移除" : "保存到工作区"} onClick={(event) => { event.stopPropagation(); toggleSaved(item.id); }}>{saved.includes(item.id) ? "★" : "☆"}</button><span className="visual-caption">PUBLIC SOURCE / {item.year}</span></div><div className="case-meta"><div><span className="case-type">{item.projectType} · {item.region}</span><h3>{item.title}</h3><p>{item.architect}</p></div><div className="case-rating">{ratings[item.id] ? `★ ${ratings[item.id]}` : "☆"}</div></div><div className="case-tags">{item.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div></article>;

  const renderCaseLibrary = () => <main className="library-page"><div className="page-intro"><div><div className="section-kicker">CASE LIBRARY / 02</div><h1>公开案例，<em>结构化研究。</em></h1><p>按类型、地域和设计语言检索案例，打开原始来源，下载可复用的研究资料包。</p></div><div className="library-stats"><strong>{cases.length.toString().padStart(2, "0")}</strong><span>精选案例<br />开放资料</span></div></div><div className="library-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、事务所、策略或材料" /></label><div className="filter-row"><span className="filter-label">类型</span>{["全部", "文化", "公共", "居住", "规划", "景观"].map((item) => <button className={typeFilter === item ? "filter-chip active" : "filter-chip"} key={item} onClick={() => setTypeFilter(item)}>{item}</button>)}</div><div className="filter-row"><span className="filter-label">地域</span>{["全部", "亚洲", "欧洲", "中东", "北美"].map((item) => <button className={regionFilter === item ? "filter-chip active" : "filter-chip"} key={item} onClick={() => setRegionFilter(item)}>{item}</button>)}</div></div><div className="library-layout"><aside className="filter-aside"><span>COLLECTION</span><button className="aside-link active">全部案例 <b>{cases.length}</b></button><button className="aside-link" onClick={() => navigate("boards", "/boards")}>我的工作区 <b>{saved.length}</b></button><span className="aside-label">研究任务</span>{taskTemplates.slice(0, 5).map((item) => <button className="aside-link" key={item.id} onClick={() => { chooseTemplate(item.id); navigate("home", "/"); }}>{item.label}</button>)}<div className="aside-bottom"><span className="tiny-mark">A</span><p>内容按原始来源和案例生产 Skill 结构化，欢迎通过 GitHub 提交补充。</p></div></aside><section className="case-grid">{filteredCases.map(renderCard)}{filteredCases.length === 0 && <div className="empty-state">没有匹配的案例。试试“公共”“亚洲”或“景观”。</div>}</section></div></main>;

  const renderDrawer = () => selected && <div className="drawer-layer" role="presentation" onClick={() => setSelected(null)}><aside className="case-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setSelected(null)} aria-label="关闭">×</button><div className="drawer-visual" style={{ background: selected.gradient }}><img src={selected.image} alt="" /><span>{selected.projectType} / {selected.year}</span><strong>{selected.title}</strong></div><div className="drawer-content"><div className="drawer-eyebrow">CASE STUDY / {selected.region}</div><h2>{selected.title}</h2><p className="drawer-byline">{selected.architect} · {selected.location}</p><p className="drawer-image-credit">图像：<a href={selected.imageCredit.url} target="_blank" rel="noreferrer">{selected.imageCredit.label}</a></p><div className="case-facts"><div><span>年份</span><strong>{selected.year}</strong></div><div><span>规模</span><strong>{selected.scale}</strong></div><div><span>类型</span><strong>{selected.typology}</strong></div></div><div className="drawer-actions"><button className="primary-button" onClick={() => downloadPack(selected)}>下载研究资料包 ↓</button><button className={saved.includes(selected.id) ? "secondary-button saved" : "secondary-button"} onClick={() => toggleSaved(selected.id)}>{saved.includes(selected.id) ? "已保存" : "保存到工作区"}</button></div><div className="drawer-section"><span className="drawer-label">项目背景</span><p>{selected.context ?? selected.short}</p></div><div className="drawer-section"><span className="drawer-label">核心理念</span><p>{selected.principle}</p></div><div className="drawer-section"><span className="drawer-label">空间策略</span><p>{selected.strategy}</p></div>{selected.researchQuestions && <div className="drawer-section"><span className="drawer-label">研究问题</span><div className="question-list">{selected.researchQuestions.map((question) => <p key={question}>↳ {question}</p>)}</div></div>}<div className="drawer-section"><span className="drawer-label">设计元素</span><div className="element-list">{selected.elements.map((element) => <span key={element}>{element}</span>)}</div></div><div className="drawer-section"><span className="drawer-label">颜色 / MATERIAL PALETTE</span><div className="palette-row">{selected.palette.map((color) => <span key={color.hex} title={`${color.name} ${color.hex}`} style={{ background: color.hex }} />)}</div>{selected.materialNotes && <p className="material-note">{selected.materialNotes}</p>}</div><div className="drawer-section rating-section"><div><span className="drawer-label">你的评分 · 本地保存</span><div className="star-row">{[1, 2, 3, 4, 5].map((rating) => <button aria-label={`${rating} 星`} key={rating} className={rating <= (ratings[selected.id] ?? 0) ? "star active" : "star"} onClick={() => rateCase(selected.id, rating)}>★</button>)}</div></div><div className="source-list"><span className="drawer-label">原始来源</span><a href={selected.imageCredit.url} target="_blank" rel="noreferrer">图像：{selected.imageCredit.license} ↗</a>{selected.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} ↗</a>)}</div></div><div className="risk-note"><span>NOTE / 迁移前先判断</span><p>{selected.risks.join(" · ")}</p></div></div></aside></div>;

  const renderMcp = () => <main className="mcp-page"><div className="mcp-hero"><div><div className="section-kicker">MODEL CONTEXT PROTOCOL / 04</div><h1>把案例带进<br /><em>你的 AI 工具。</em></h1><p>ArchLens 不提供官方 AI 推理。8 个只读工具、可读取资源和研究提示模板，把开放案例与原始来源交给你的 Agent。</p></div><div className="endpoint-card"><span>LIVE · TOOLS + RESOURCES + PROMPTS</span><code>/api/mcp</code><small>https://archlens.yiking233.chatgpt.site/api/mcp</small></div></div><div className="mcp-layout"><section className="tool-list"><div className="section-kicker">TOOLS / {String(mcpTools.length).padStart(2, "0")}</div>{mcpTools.map((tool) => <button className={mcpTool === tool.name ? "tool-item active" : "tool-item"} key={tool.name} onClick={() => { setMcpTool(tool.name); setMcpInput(mcpExampleInput(tool.name)); }}><span className="tool-num">{String(mcpTools.indexOf(tool) + 1).padStart(2, "0")}</span><span><strong>{tool.label}</strong><small>{tool.description}</small></span><b>↗</b></button>)}</section><section className="playground"><div className="playground-head"><div><div className="section-kicker">MCP PLAYGROUND</div><h2>真实调用，直接看返回值。</h2></div><span className="transport-badge">JSON-RPC / HTTP</span></div><div className="code-panel"><div className="code-top"><span>REQUEST · {mcpTool}</span><span className="live-dot">● live</span></div><textarea className="json-editor" value={mcpInput} onChange={(event) => setMcpInput(event.target.value)} spellCheck={false} aria-label="MCP 参数 JSON" /><button className="primary-button execute-button" onClick={executeMcp} disabled={mcpBusy}>{mcpBusy ? "调用中…" : "执行 MCP 调用 →"}</button></div><div className="code-panel output-panel"><div className="code-top"><span>RESPONSE · STRUCTURED CONTENT</span><button onClick={() => navigator.clipboard?.writeText(mcpOutput)}>复制 JSON</button></div><pre>{mcpOutput}</pre></div></section></div><div className="mcp-footer-note"><span>OPEN SOURCE CONTRACT</span><p>工具 schema、可读资源、研究提示、案例生产 Skill 和贡献模板均公开。外部 Agent 可以直接读取案例，也可以在 GitHub 提交新的研究 Wish List。</p><a href="/api/mcp" target="_blank" rel="noreferrer">查看 Endpoint 状态 ↗</a></div></main>;

  const renderBoards = () => <main className="boards-page"><div className="page-intro"><div><div className="section-kicker">WORKSPACE / 03</div><h1>把发现留下，<em>变成下一步。</em></h1><p>轻量保存案例、记录评分，把研究任务和 Wish List 带进开源协作。</p></div><div className="workspace-count"><strong>{saved.length.toString().padStart(2, "0")}</strong><span>已保存案例</span></div></div>{sharedInvite && <section className="workspace-share-card"><div><div className="section-kicker">SHARED WORKSPACE INVITE</div><h2>{sharedInvite.spaceId}<em> / {sharedInvite.memberId}</em></h2><p>邀请链接只在浏览器中交接 token。点击同步后，服务端仍会校验角色、过期时间和 workspace quota。</p></div><div className="workspace-share-actions"><button className="primary-button" onClick={syncSharedWorkspace} disabled={sharedSyncBusy}>{sharedSyncBusy ? "同步中…" : "同步共享空间"}</button><button className="secondary-button" onClick={clearSharedInvite}>清除邀请</button></div></section>}<div className="boards-grid"><section className="saved-board"><div className="board-head"><div><span className="section-kicker">SAVED CASES</span><h2>我的研究清单</h2></div><button className="secondary-button" onClick={() => navigate("cases", "/cases")}>+ 添加案例</button></div>{saved.length ? <div className="saved-list">{saved.map((id) => { const item = findCase(id); return item ? <button className="saved-row" key={id} onClick={() => setSelected(item)}><span className="saved-thumb" style={{ background: item.gradient }} /><span className="saved-name"><strong>{item.title}</strong><small>{item.architect} · {item.typology}</small></span><span className="saved-star">{ratings[item.id] ? `★ ${ratings[item.id]}` : "☆"}</span><span>→</span></button> : null; })}</div> : <div className="board-empty"><span>☆</span><strong>工作区还是空的</strong><p>从案例库保存一个项目，再回来组织你的研究线索。</p><button className="primary-button" onClick={() => navigate("cases", "/cases")}>浏览案例库</button></div>}</section><section className="wishlist-card"><div className="section-kicker">OPEN CONTRIBUTION</div><h2>把下一个案例，<br /><em>带进资料库。</em></h2><p>已经有项目名称、公开来源和许可说明？直接使用案例模板提交，后续仍会经过来源核验、人工审阅和数据集门禁。</p><a className="secondary-button contribution-button" href="https://github.com/YiJing233/archlens/issues/new?template=case-submission.yml" target="_blank" rel="noreferrer">提交完整案例资料 ↗</a><div className="contribution-divider"><span>或先告诉我们研究方向</span></div><textarea value={wishList} onChange={(event) => setWishList(event.target.value)} placeholder="例如：更多东南亚热带建筑，关注遮阳、自然通风和低技建造。" /><button className="primary-button full" onClick={submitWishList}>提交 Wish List ↗</button>{wishSent && <span className="sent-note">✓ 已打开 GitHub 提交页</span>}</section></div><section className="workspace-transfer"><div><div className="section-kicker">PORTABLE WORKSPACE</div><h2>把研究清单带走，<em>再交给下一个人。</em></h2><p>导出收藏、评分和最近研究任务；导入时会校验 schema，并忽略当前数据集不存在的案例。文件不上传到 ArchLens。</p></div><div className="workspace-transfer-actions"><button className="secondary-button" onClick={exportWorkspace}>导出工作区 JSON ↓</button><button className="primary-button" onClick={() => workspaceFileInput.current?.click()}>导入工作区 JSON ↑</button><input ref={workspaceFileInput} className="workspace-file-input" type="file" accept="application/json,.json" onChange={importWorkspace} aria-label="选择工作区 JSON 文件" /></div></section><section className="workflow-strip"><div><span className="section-kicker">CASE PRODUCTION SKILL</span><h2>从原始资料，到可复用的研究包。</h2></div><div className="workflow-steps">{["采集来源", "清洗与结构化", "提取理念 / 元素", "核验与发布"].map((step, index) => <div key={step}><span>0{index + 1}</span><strong>{step}</strong>{index < 3 && <i>→</i>}</div>)}</div></section></main>;

  const renderProject = () => <main className="project-page"><section className="project-hero"><div><div className="section-kicker">ABOUT THE PROJECT / 05</div><h1>不是收藏更多，<br /><em>而是理解更深。</em></h1><p>ArchLens / 建筑透镜，是一个开源的建筑与城市设计案例知识入口。我们把项目原始资料、设计判断和可复用工具放在同一条公开链路上。</p></div><div className="project-stamp"><span>OPEN SOURCE</span><strong>2026—</strong><small>CASE / METHOD / CONTEXT</small></div></section><section className="project-manifesto"><div className="section-kicker">OUR PRINCIPLES / 01</div><div className="principle-grid">{projectPrinciples.map((item) => <article className="principle-card" key={item.index}><span>{item.index}</span><h2>{item.title}</h2><p>{item.body}</p><small>{item.action}</small></article>)}</div></section><section className="project-tracks"><div className="project-section-head"><div><div className="section-kicker">OUR TASKS / 02</div><h2>我们现在要把什么做好</h2></div><p>先把资料和研究基础做扎实，再谈更复杂的 AI 能力。</p></div><div className="track-grid">{projectTracks.map((item, index) => <article className="track-card" key={item.title}><span>0{index + 1} / {item.label}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section><section className="project-expectations"><div className="section-kicker">OUR EXPECTATIONS / 03</div><h2>希望它最终成为谁的基础设施？</h2><div className="expectation-grid">{projectExpectations.map((item) => <article key={item.label}><span>{item.label}</span><p>{item.body}</p></article>)}</div></section><section className="project-code"><div><div className="section-kicker">CODE MAP / 04</div><h2>代码应该让理念可执行。</h2><p>项目把产品界面、案例知识、MCP 领域层和内容生产 Skill 分开，但用同一个 schema 连接起来。</p></div><div className="code-map-grid">{codeMap.map((item) => <div className="code-map-item" key={item.path}><code>{item.path}</code><strong>{item.label}</strong><p>{item.body}</p></div>)}</div></section><section className="milestone-section"><div className="project-section-head"><div><div className="section-kicker">MILESTONES / 05</div><h2>从 Demo 到开放知识基础设施</h2></div><p>每个阶段都有可以被检查的交付物，不用“以后会有”替代真正的进度。</p></div><div className="milestone-list">{milestones.map((item) => <article className={item.status === "当前" ? "milestone-card current" : "milestone-card"} key={item.phase}><div className="milestone-top"><span>{item.phase}</span><b>{item.status}</b></div><h3>{item.title}</h3><p>{item.summary}</p><ul>{item.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul></article>)}</div></section></main>;


  return <div className="site-shell">{renderNav()}<div className="page-body">{view === "home" && <><main><div className="home-wrap">{renderHero()}{renderTemplateRow()}<section className="featured-section"><div className="section-kicker">FEATURED CASES / {String(cases.length).padStart(2, "0")}</div><div className="section-head"><h2>从这里开始研究</h2><button className="text-button" onClick={() => navigate("cases", "/cases")}>查看全部案例 →</button></div><div className="featured-grid">{cases.slice(0, 4).map(renderCard)}</div></section></div></main></>}{view === "cases" && renderCaseLibrary()}{view === "boards" && renderBoards()}{view === "project" && renderProject()}{view === "mcp" && renderMcp()}</div>{renderDrawer()}{toast && <div className="toast">{toast}</div>}</div>;
}
