export type CaseStudy = {
  id: string;
  title: string;
  architect: string;
  location: string;
  year: string;
  typology: string;
  region: string;
  scale: string;
  projectType: "文化" | "公共" | "居住" | "规划";
  gradient: string;
  image: string;
  imageCredit: { label: string; url: string; license: string };
  short: string;
  principle: string;
  strategy: string;
  elements: string[];
  palette: { name: string; hex: string }[];
  sources: { label: string; url: string }[];
  risks: string[];
  tags: string[];
  context?: string;
  researchQuestions?: string[];
  materialNotes?: string;
}

export const cases: CaseStudy[] = [
  {
    id: "heydar-aliyev-centre",
    title: "Heydar Aliyev Centre",
    architect: "Zaha Hadid Architects",
    location: "Baku, Azerbaijan",
    year: "2012",
    typology: "文化中心",
    region: "中东",
    scale: "101,801 m²",
    projectType: "文化",
    gradient: "linear-gradient(135deg, #d9d2c8 0%, #8d918d 42%, #222a29 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/0e/HEYDAR_ALIYEV_CENTER_INDOORS.%D7%97%D7%9C%D7%9C_%D7%A4%D7%A0%D7%99%D7%9E%D7%99_%D7%9E%D7%95%D7%93%D7%A8%D7%A0%D7%99_%D7%91%D7%9E%D7%A8%D7%9B%D7%96_%D7%94%D7%99%D7%99%D7%93%D7%A8_%D7%90%D7%9C%D7%99%D7%99%D7%91.jpg",
    imageCredit: { label: "Wikimedia Commons / CC0", url: "https://commons.wikimedia.org/wiki/File:HEYDAR_ALIYEV_CENTER_INDOORS.%D7%97%D7%9C%D7%9C_%D7%A4%D7%A0%D7%99%D7%9E%D7%99_%D7%9E%D7%95%D7%93%D7%A8%D7%A0%D7%99_%D7%91%D7%9E%D7%A8%D7%9B%D7%96_%D7%94%D7%99%D7%99%D7%93%D7%A8_%D7%90%D7%9C%D7%99%D7%99%D7%91.jpg", license: "CC0" },
    short: "连续曲面把广场、建筑和公共活动编织成一条可步行的地景。",
    principle: "通过连续的公共地面消解建筑与城市之间的边界，让文化建筑成为可进入的城市地形。",
    strategy: "将广场、入口大厅和主要公共空间组织成一条无台阶的流线，曲面外皮同时承担导向与识别。",
    elements: ["连续曲面", "公共地景", "无台阶动线", "白色外皮", "城市广场"],
    palette: [{ name: "骨白", hex: "#e6e0d4" }, { name: "石灰灰", hex: "#aaa79d" }, { name: "深影", hex: "#2f3735" }],
    sources: [{ label: "Zaha Hadid Architects 项目页", url: "https://www.zaha-hadid.com/architecture/heydar-aliyev-centre/" }],
    risks: ["连续曲面需要高精度节点与施工协同", "形式语言不能替代公共活动运营"],
    tags: ["公共地景", "流线", "连续曲面"],
    context: "项目把一座文化中心放在城市广场与公共活动之间，重点不只是建筑造型，而是重新定义进入、停留和穿行。",
    researchQuestions: ["公共地面如何变成建筑的一部分？", "连续流线如何服务不同强度的公共活动？"],
    materialNotes: "白色复合外皮、连续曲面、低视觉干扰的广场界面。",
  },
  {
    id: "maxxi",
    title: "MAXXI: National Museum of XXI Century Arts",
    architect: "Zaha Hadid Architects",
    location: "Rome, Italy",
    year: "2009",
    typology: "艺术博物馆",
    region: "欧洲",
    scale: "27,000 m²",
    projectType: "文化",
    gradient: "linear-gradient(145deg, #222322 5%, #5e665f 47%, #b7b9af 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/4/43/More_than_meets_the_eye_MAXXI_Roma_2015.jpg",
    imageCredit: { label: "Wikimedia Commons / CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:More_than_meets_the_eye_MAXXI_Roma_2015.jpg", license: "CC BY-SA 4.0" },
    short: "多条交叉的展览路径让建筑成为可持续变化的空间框架。",
    principle: "让展览路径、城市流线和时间性的艺术事件共同塑造空间，而不是用单一轴线规定观看。",
    strategy: "用交叉、悬挑和上方采光带组织可变展厅，让不同尺度的展览在同一框架里切换。",
    elements: ["交叉流线", "采光带", "悬挑体量", "可变展厅", "黑白对比"],
    palette: [{ name: "炭黑", hex: "#202321" }, { name: "混凝土", hex: "#9a9c95" }, { name: "天光", hex: "#d9ddd4" }],
    sources: [{ label: "MAXXI 官方项目页", url: "https://www.maxxi.art/en/" }, { label: "Zaha Hadid Architects", url: "https://www.zaha-hadid.com/architecture/maxxi/" }],
    risks: ["复杂流线需要清晰的导视系统", "开放展厅对声学和运营要求较高"],
    tags: ["展览", "流线", "可变空间"],
    context: "MAXXI 面对的是艺术展示不断变化的问题，因此空间框架比固定展厅形状更重要。",
    researchQuestions: ["展览路径如何影响观看顺序？", "可变空间需要哪些导视和声环境条件？"],
    materialNotes: "混凝土、钢、黑色天花和顶部采光带共同形成方向感。",
  },
  {
    id: "vitra-fire-station",
    title: "Vitra Fire Station",
    architect: "Zaha Hadid Architects",
    location: "Weil am Rhein, Germany",
    year: "1993",
    typology: "消防站",
    region: "欧洲",
    scale: "852 m²",
    projectType: "公共",
    gradient: "linear-gradient(120deg, #1b2429 0%, #697472 40%, #d4c6b6 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Vitra_Campus_-_Hadid_Fire_Station_-_full_view%2C_blue_sky.jpg",
    imageCredit: { label: "Wikimedia Commons / CC0", url: "https://commons.wikimedia.org/wiki/File:Vitra_Campus_-_Hadid_Fire_Station_-_full_view,_blue_sky.jpg", license: "CC0" },
    short: "锐利的线性墙体把速度、警觉和队列感凝固成空间。",
    principle: "从行动状态出发组织建筑，使结构、动线和视觉张力服务于即时响应。",
    strategy: "用折线墙体定义开放的车辆场地和内部秩序，避免传统房间式分隔。",
    elements: ["折线墙体", "开放场地", "线性构件", "即时响应", "灰色混凝土"],
    palette: [{ name: "铅灰", hex: "#64706f" }, { name: "深蓝灰", hex: "#233038" }, { name: "暖砂", hex: "#c8b49c" }],
    sources: [{ label: "Zaha Hadid Architects 项目页", url: "https://www.zaha-hadid.com/architecture/vitra-fire-station/" }],
    risks: ["空间的开放性可能削弱后勤收纳效率", "强烈的形态需要明确的使用逻辑支撑"],
    tags: ["响应", "线性", "构造"],
    context: "消防站把即时响应作为首要任务，建筑的线性构件和开放场地都围绕行动速度组织。",
    researchQuestions: ["如何把运营逻辑转译为空间秩序？", "强烈形式如何避免干扰后勤效率？"],
    materialNotes: "灰色混凝土、折线墙体和连续地面共同构成紧张的线性空间。",
  },
  {
    id: "8-house",
    title: "8 House",
    architect: "BIG — Bjarke Ingels Group",
    location: "Copenhagen, Denmark",
    year: "2010",
    typology: "混合社区",
    region: "欧洲",
    scale: "62,000 m²",
    projectType: "居住",
    gradient: "linear-gradient(135deg, #81918e 0%, #c7c0ae 43%, #404d51 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/96/BIG_-_8_House.jpg",
    imageCredit: { label: "Wikimedia Commons / CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:BIG_-_8_House.jpg", license: "CC BY 2.0" },
    short: "一条连续上升的公共路径把办公、商业和居住串成混合社区。",
    principle: "通过把不同功能混合在一条可步行的框架里，让日常活动共享空间价值。",
    strategy: "环形体量在不同角部抬升和压低，使住宅获得阳光与视野，底层商业面向街道。",
    elements: ["连续坡道", "混合功能", "内向庭院", "街道界面", "绿色屋面"],
    palette: [{ name: "苔藓绿", hex: "#81918e" }, { name: "沙色", hex: "#c7c0ae" }, { name: "深靛", hex: "#404d51" }],
    sources: [{ label: "BIG 官方项目页", url: "https://big.dk/projects/8-house-2021" }],
    risks: ["混合功能需要清楚的共享空间管理", "连续坡道的无障碍和排水必须同步设计"],
    tags: ["混合功能", "社区", "坡道"],
    context: "8 House 试图把办公、商业和居住放进同一个可步行的社区框架，研究重点是混合功能如何产生额外公共价值。",
    researchQuestions: ["混合功能如何共享公共空间？", "连续坡道如何同时承担社交、无障碍和交通？"],
    materialNotes: "砖、玻璃、绿色屋面和连续外部路径共同形成生活化的街区尺度。",
  },
  {
    id: "chichu-art-museum",
    title: "Chichu Art Museum",
    architect: "Tadao Ando Architect & Associates",
    location: "Naoshima, Japan",
    year: "2004",
    typology: "地下美术馆",
    region: "亚洲",
    scale: "地下场地",
    projectType: "文化",
    gradient: "linear-gradient(135deg, #d7d7cd 0%, #71807b 42%, #283535 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Chichu_art_museum02s2560.jpg",
    imageCredit: { label: "Wikimedia Commons / CC BY 2.5", url: "https://commons.wikimedia.org/wiki/File:Chichu_art_museum02s2560.jpg", license: "CC BY 2.5" },
    short: "把大部分建筑埋入地下，让自然光成为展览体验的一部分。",
    principle: "以最小的地表干预保护场地自然性，并让光线、时间和艺术共同构成空间。",
    strategy: "用地下几何体量和天井引入自然光，组织作品、路径和季节变化之间的关系。",
    elements: ["地下体量", "天井", "自然光", "清水混凝土", "场地隐身"],
    palette: [{ name: "雾灰", hex: "#d7d7cd" }, { name: "苔绿", hex: "#71807b" }, { name: "深海", hex: "#283535" }],
    sources: [{ label: "Benesse Art Site 官方项目页", url: "https://benesse-artsite.jp/en/art/chichu.html" }],
    risks: ["地下空间依赖精准的采光、排水和防潮", "过度克制可能降低首次到访者的可识别性"],
    tags: ["场地", "自然光", "地下"],
    context: "Chichu Art Museum 把建筑大部分隐藏在地下，以最小的地表介入保护直岛环境，并让自然光参与作品体验。",
    researchQuestions: ["隐身的建筑如何保持公共可达性？", "自然光如何成为空间和展览的共同材料？"],
    materialNotes: "清水混凝土、天井、阴影和经过控制的自然光。",
  },
  {
    id: "harbin-opera-house",
    title: "Harbin Opera House",
    architect: "MAD Architects",
    location: "Harbin, China",
    year: "2015",
    typology: "歌剧院",
    region: "亚洲",
    scale: "79,000 m²",
    projectType: "文化",
    gradient: "linear-gradient(135deg, #d9e3e0 0%, #89999b 44%, #25343b 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/34/Harbin_Grand_Theatre_Pano_201609.jpg",
    imageCredit: { label: "Wikimedia Commons / CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Harbin_Grand_Theatre_Pano_201609.jpg", license: "CC BY 2.0" },
    short: "流动的白色外壳回应寒地风景，把公共平台推向松花江。",
    principle: "把建筑看作被风和水塑形的地貌，让公共活动沿着外壳连续展开。",
    strategy: "以折叠的外皮包裹大小剧场，并把屋顶、广场和观景路径连接成公共地形。",
    elements: ["折叠外皮", "寒地回应", "公共屋顶", "水岸关系", "剧场声学"],
    palette: [{ name: "雪白", hex: "#d9e3e0" }, { name: "雾蓝", hex: "#89999b" }, { name: "江岸深灰", hex: "#25343b" }],
    sources: [{ label: "MAD Architects 项目资料", url: "https://www.i-mad.com/work/harbin-opera-house/" }],
    risks: ["寒地维护成本与结冰风险需要前置评估", "外壳复杂度会显著影响建造预算"],
    tags: ["寒地", "地貌", "公共屋顶"],
    context: "哈尔滨歌剧院把寒地滨水环境当作建筑的起点，公共路径、观景平台和剧场外壳被组织成连续地形。",
    researchQuestions: ["寒地气候如何改变公共空间的开放方式？", "复杂外壳如何同时承担识别与维护？"],
    materialNotes: "白色外壳、折叠表皮、石材和大尺度公共台阶。",
  },
  {
    id: "rolex-learning-centre",
    title: "Rolex Learning Center",
    architect: "SANAA",
    location: "Lausanne, Switzerland",
    year: "2010",
    typology: "学习中心",
    region: "欧洲",
    scale: "20,000 m²",
    projectType: "公共",
    gradient: "linear-gradient(135deg, #e8e2d3 0%, #a8b2aa 42%, #4e6268 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Rolex_Learning_center.jpg",
    imageCredit: { label: "Wikimedia Commons / CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Rolex_Learning_center.jpg", license: "CC BY-SA 3.0" },
    short: "连续起伏的地面把学习、交流、阅读和休憩放在同一个开放平面。",
    principle: "用连续而非分隔的空间支持不同强度的学习与社交，让公共性成为组织工具。",
    strategy: "以缓坡、天井和大跨度结构塑造开放平面，活动密度随着地形和光线变化。",
    elements: ["连续地面", "天井", "开放学习", "微地形", "柔性边界"],
    palette: [{ name: "纸白", hex: "#e8e2d3" }, { name: "雾绿", hex: "#a8b2aa" }, { name: "蓝灰", hex: "#4e6268" }],
    sources: [{ label: "EPFL 官方项目页", url: "https://www.epfl.ch/campus/visitors/en/rolex-learning-center/" }],
    risks: ["开放平面需要高质量声环境分区", "流动空间要有足够的家具和标识支撑使用"],
    tags: ["学习", "连续空间", "开放平面"],
    context: "Rolex Learning Center 把学习、交流和休息放在一个没有明确房间边界的连续平面中，公共性来自空间的可选择性。",
    researchQuestions: ["开放平面如何支持不同专注程度？", "微地形如何替代传统房间分隔？"],
    materialNotes: "浅色地面、柔性家具、天井和连续起伏的室内地形。",
  },
  {
    id: "sendai-mediatheque",
    title: "Sendai Mediatheque",
    architect: "Toyo Ito & Associates",
    location: "Sendai, Japan",
    year: "2001",
    typology: "媒体中心",
    region: "亚洲",
    scale: "21,682 m²",
    projectType: "公共",
    gradient: "linear-gradient(135deg, #d8d6ca 0%, #9caa9c 43%, #394e4c 100%)",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/14/Sendai_Mediatheque_2009.jpg",
    imageCredit: { label: "Wikimedia Commons / CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Sendai_Mediatheque_2009.jpg", license: "CC BY 2.0" },
    short: "树状结构管把不同媒介和公共活动叠合在一个透明框架里。",
    principle: "用基础设施而不是固定房间定义公共建筑，让信息、光线和人的流动保持开放。",
    strategy: "以十三根结构管承载设备、交通和环境系统，楼板保持尽可能自由的公共平面。",
    elements: ["结构管", "透明界面", "自由平面", "多媒体", "城市客厅"],
    palette: [{ name: "暖灰", hex: "#d8d6ca" }, { name: "叶绿", hex: "#9caa9c" }, { name: "墨绿", hex: "#394e4c" }],
    sources: [{ label: "Sendai Mediatheque 官方资料", url: "https://www.smt.jp/en/" }],
    risks: ["系统集成需要长期维护策略", "透明界面与开放结构对热舒适提出更高要求"],
    tags: ["基础设施", "媒体", "透明"],
    context: "Sendai Mediatheque 用结构管承载交通、设备和环境系统，让楼板保持自由，把建筑变成可持续变化的城市客厅。",
    researchQuestions: ["基础设施如何成为空间而不是隐藏在空间之后？", "透明开放的公共建筑如何处理热舒适和维护？"],
    materialNotes: "钢结构管、玻璃幕墙、自由平面和可变媒体设施。",
  },
];

const requiredCaseFields: (keyof CaseStudy)[] = ["id", "title", "architect", "location", "year", "typology", "region", "scale", "projectType", "image", "short", "principle", "strategy"];

export function validateCaseLibrary(items: readonly CaseStudy[] = cases) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const item of items) {
    for (const field of requiredCaseFields) if (typeof item[field] !== "string" || !item[field].trim()) errors.push(`${item.id || "<unknown>"}.${field} 必须是非空字符串`);
    if (ids.has(item.id)) errors.push(`${item.id}.id 不能重复`);
    ids.add(item.id);
    if (!item.imageCredit?.url.startsWith("https://") || !item.imageCredit.license.trim()) errors.push(`${item.id}.imageCredit 必须包含 HTTPS 来源和许可`);
    if (!item.sources.length || item.sources.some((source) => !source.url.startsWith("https://") || !source.label.trim())) errors.push(`${item.id}.sources 必须包含带标签的 HTTPS 来源`);
    if (!item.elements.length || !item.palette.length || !item.risks.length || !item.tags.length) errors.push(`${item.id} 的 elements、palette、risks、tags 不能为空`);
    if (item.palette.some((color) => !/^#[0-9a-f]{6}$/i.test(color.hex))) errors.push(`${item.id}.palette 包含无效 HEX 颜色`);
  }
  if (errors.length) throw new Error(`案例数据校验失败：\n${errors.join("\n")}`);
  return { caseCount: items.length };
}

validateCaseLibrary();

export const taskTemplates = [
  { id: "principles", label: "提取设计思路", hint: "从一个案例里读懂它如何工作", prompt: "提取这个项目的核心理念、问题意识和空间策略，并标注每条判断的原始依据。" },
  { id: "elements", label: "识别设计元素", hint: "整理形态、动线、材料和界面", prompt: "拆解这个项目的体量、动线、材料、色彩和公共空间元素，输出可比较的结构化清单。" },
  { id: "compare", label: "比较案例", hint: "把不同项目放在同一个框架里", prompt: "比较三个案例在场地回应、公共性、空间组织和建造风险上的相同点与差异。" },
  { id: "palette", label: "提取颜色与材料", hint: "快速建立材料与氛围参考", prompt: "从原始案例资料中提取颜色、材质、光线和触感线索，并说明它们如何服务于空间体验。" },
  { id: "critique", label: "做一次方案批评", hint: "找出可迁移与不可复制的部分", prompt: "以建筑设计评审的方式，指出这个案例最值得借鉴的策略、潜在误读和实施风险。" },
  { id: "wishlist", label: "提出案例 Wish List", hint: "告诉社区下一步应该研究什么", prompt: "我希望看到更多关于某个建筑类型、地区、材料或设计策略的公开案例。" },
];

export const mcpTools = [
  { name: "search_cases", label: "检索案例", description: "按关键词、类型、地域和策略检索可追溯案例。" },
  { name: "get_case", label: "获取案例", description: "获取完整案例资料卡、设计元素、风险与来源。" },
  { name: "extract_design_elements", label: "提取设计元素", description: "返回结构化的理念、空间策略、元素和颜色。" },
  { name: "compare_cases", label: "比较案例", description: "用同一套字段比较多个案例，方便外部 Agent 继续工作。" },
  { name: "build_research_pack", label: "生成资料包", description: "输出可下载的 Markdown/JSON/README 研究资料包内容。" },
];

export function findCase(id: string) {
  return cases.find((item) => item.id === id);
}
