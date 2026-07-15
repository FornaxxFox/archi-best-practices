# references/ INDEX

> 21 个 reference 文档 + 2 个 JSON canonical，按编号排序。
> SKILL.md 主入口通过文件名直接引用，例：`(references/03-title-formulas.md)`。

| 编号 | 文件 | 用途 | 来源（原 15-skill）|
|---|---|---|---|
| 00 | `00-state-schema.md` | project-state.json + series-state.json schema canonical | 编辑部编排/references/state-schema.md |
| 01 | `01-historical-insights.md` | publish-history.jsonl 回灌 → 选题推荐 schema | 选题策划/references/historical-insights.md |
| 01 | `01-persona-template.md` | persona 8 维度模板 | 人设语料库/references/persona-template.md |
| 02 | `02-topic-template.md` | 单个选题角度结构 | 选题策划/references/topic-template.md |
| 02 | `02-viral-patterns.md` | 4 种爆款结构（痛点/反常识/干货/情绪）| 选题策划/references/viral-patterns.md |
| 03 | `03-body-structures.md` | 长/短版正文结构 | 文案撰写/references/body-structures.md |
| 03 | `03-hashtag-strategy.md` | 标签组合公式（大/准/长尾）| 文案撰写/references/hashtag-strategy.md |
| 03 | `03-title-formulas.md` | 6 种标题公式 | 文案撰写/references/title-formulas.md |
| 04 | `04-9-page-layouts.md` | 9 页标准骨架 | 海报生成/references/9-page-layouts.md |
| 04 | `04-prompt-templates.md` | 封面插图 ImageGen prompt 模板 | 封面插图/references/prompt-templates.md |
| 05 | `05-six-dimension-rubric.md` | 主编六维评分卡 | 主编审阅/references/six-dimension-rubric.md |
| 05 | `05-three-reader-scripts.md` | 3 读者 OS 模拟 | 观众视角/references/three-reader-scripts.md |
| 06 | `06-compliance-checklist.md` | 合规红线（广告法/极限词/医疗金融）| 责任编辑审校/references/compliance-checklist.md |
| 06 | `06-risk-checklist.md` | 6 类风险提示 | 责任编辑审校/references/risk-checklist.md |
| 06 | `06-viral-checklist.md` | 爆款要素 7 项 | 责任编辑审校/references/viral-checklist.md |
| 07 | `07-cross-post-schedule.md` | 6 平台错峰表（auto-generated）| 多平台适配/references/cross-post-schedule.md |
| 07 | `07-platform-specs.md` | 6 平台规格（字数/图比/标签）| 多平台适配/references/platform-specs.md |
| 07 | `07-tone-mapping.md` | 6 平台语感转换 + 模板示例 | 多平台适配/references/tone-mapping.md |
| 08 | `08-scheduling-patterns.md` | 节奏 + 黄金时段 | 系列化规划/references/scheduling-patterns.md |
| 08 | `08-series-structures.md` | 5 种系列结构 + 5 个 Worked 示例 | 系列化规划/references/series-structures.md |
| 09 | `09-metrics-template.md` | 复盘数据模板（基准线 + JSONL schema）| 发布复盘/references/metrics-template.md |

## 2 个 JSON canonical

| 文件 | 用途 |
|---|---|
| `schedule.json` | 6 平台错峰时间（`scripts/render_schedule_tables.py` 从此生成 markdown 表）|
| `forbidden_defaults.json` | 7 类 ~50 词 forbidden curated（`scripts/forbidden_extractor.py` 读取）|
