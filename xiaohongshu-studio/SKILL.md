---
name: xiaohongshu-studio
version: 1.4.1
description: All-in-one 小红书图文工厂。从一篇文章/链接/书名 → 可直接发布的小红书海报风图文。包含 9-stage 编排流水线（原文摄入→选题→文案→海报→封面→责编→主编→观众→打包→复盘）+ 3 个独立 skill（系列化规划 / 多平台适配 / 人设语料库）+ 2 个共享 utility（python-pptx helpers / forbidden_phrases extractor）。一鱼多吃 + 系列化内容 + 人设语料库全流程。
description_zh: 小红书图文工厂 mega-skill v1.4.1。从素材到 9 页 PPT 发布包的全流程编排 + 系列化 + 多平台一鱼多吃 + 人设一致性。15-skill plugin 的单文件合并版。
user-invocable: true
argument-hint: 输入素材（书名/URL/粘贴正文/已有系列名），或具体 skill 名（系列化规划/多平台适配/人设语料库/...）
---

# 小红书图文工厂 · Xiaohongshu Studio (Mega-Skill)

> **v1.4.1 mega-skill 形态**：本文件 = 15-skill plugin 的单文件合并版。
> 文件数从 77 → 58 (↓ 25%)。所有 9-stage 流水线 + 3 个独立 skill + 2 个共享 utility 都在本文。
> 详细 reference 见 `references/`（按编号排序 21 个 .md + 2 个 .json）。
> 详细 state 契约见 `references/00-state-schema.md`。
> 详细 JSON Schema 见 `schemas/`（5 个 jsonschema）。

## 何时用

- ✅ "帮我拆《XX》做小红书图文"
- ✅ "把 [URL] 变成小红书海报"
- ✅ "做 XX 系列的第 N 期"
- ✅ "跑完整个排期表"
- ✅ "把上周内容也发到抖音/公众号/知乎"
- ✅ "提取我的语感，以后写文案自动用"
- ✅ "复盘上期"

**不适用**：
- ❌ 只想改单个标题/正文（直接调内部 step，不要全套流水线）
- ❌ 跨账号管理（本 skill 单账号假设）
- ❌ AI 视频生成（小红书图文，不含视频）

## 文件结构

```
SKILL.md                        ← 本文件
README.md                       ← 用户文档
UPGRADE.md / CHANGELOG.md / CONNECTORS.md

references/                     ← 21 个 reference 文档 + 2 个 JSON
├── 00-state-schema.md          ← project-state.json schema
├── 01-historical-insights.md   ← 历史数据回灌 schema
├── 01-persona-template.md      ← 人设语料库模板
├── 02-topic-template.md        ← 选题模板
├── 02-viral-patterns.md        ← 4 种爆款结构
├── 03-body-structures.md       ← 长/短版正文结构
├── 03-hashtag-strategy.md      ← 标签组合公式
├── 03-title-formulas.md        ← 6 种标题公式
├── 04-9-page-layouts.md        ← 9 页标准骨架
├── 04-prompt-templates.md      ← 封面插图 prompt 模板
├── 05-six-dimension-rubric.md  ← 主编六维评分
├── 05-three-reader-scripts.md  ← 观众视角 3 角色
├── 06-compliance-checklist.md  ← 合规红线
├── 06-risk-checklist.md        ← 风险提示
├── 06-viral-checklist.md       ← 爆款要素 7 项
├── 07-cross-post-schedule.md   ← 跨平台错峰表 (auto-generated)
├── 07-platform-specs.md        ← 6 平台规格
├── 07-tone-mapping.md          ← 6 平台语感转换
├── 08-scheduling-patterns.md   ← 节奏 + 黄金时段
├── 08-series-structures.md     ← 5 种系列结构 + Worked 示例
├── 09-metrics-template.md      ← 复盘数据模板
├── schedule.json               ← 6 平台错峰时间 canonical
└── forbidden_defaults.json     ← 7 类 ~50 词 forbidden curated

schemas/                        ← 5 个 jsonschema (机器可校验)
scripts/                        ← 7 个 Python 工具
├── pptx_helpers.py             ← 调色板 + 封面嵌入 + 兼容 normalizer
├── forbidden_extractor.py       ← 3 源合并 + word-boundary 匹配
├── state_io.md                 ← 路径解析/状态机/阈值契约 prose canonical
├── validate.py                 ← 5 项 manifest 校验
├── validate_skill_outputs.py   ← 5 项 skill output 校验
├── render_schedule_tables.py   ← schedule.json → 3 个 markdown 表
└── migrate_v1_3_to_v1_4.py     ← M27 迁移（dry-run / apply / rollback）

examples/                       ← 4 个 fixture
tests/                          ← 40 pytest
Makefile                        ← test / validate / render / migrate targets
```

## 9-Stage 流水线（编辑部编排）

```
[你] 提供素材
   ↓
[1] 原文摄入 ─────── 结构化拆解卡 → references/02-topic-template.md
   ↓
[2] 选题策划 ─────── 3-5 候选 + 推荐 1 → references/02-viral-patterns.md
   ↓ 【暂停：等你拍板 1 个角度】
[3] 文案撰写 ┐
[4] 海报生成 ├ 并行执行（基于同一选中角度）→ references/03 + 04
[5] 封面插图 ┘   （海报内部调用 ImageGen）→ references/04-prompt-templates.md
   ↓
[6] 责编审校 ─────── 合规 + 爆款 + 风险 → references/06-*
   ↓ 【驳回 → 回炉 3/4/5】
[7] 主编审阅 ─────── 知识密度/原创/逻辑/风格/审美/稀缺 → references/05-six-dimension-rubric.md
   ↓ 【回炉 → 定向重跑】
[8] 观众视角 ─────── 3 读者模拟 + A/B 封面建议 → references/05-three-reader-scripts.md
   ↓ 【流失点 → 优化封面/前 3 页】
[9] 发布物打包 ────── 汇总 + 6 平台错峰表 → references/07-cross-post-schedule.md
   ↓
[你] 拿到 outputs/，导出 PNG 发布
   ↓ （24h+ 后）
[10] 发布复盘 ─────── 数据回灌 → references/09-metrics-template.md + references/01-historical-insights.md
   ↓
下一期选题时读 references/01-historical-insights.md (live data)
```

## 3 个独立 Skill

### A. 系列化规划（references/08-series-structures.md）

**输入**：大主题 + 期数 + 节奏偏好
**输出**：series-bible.md（命名 / 排期 / 跨期引用 / 累计涨粉预估）
**结构类型**：渐进深入 / 并列主题 / 故事线 / 挑战体 / 问答体（5 种）

### B. 多平台适配（references/07-tone-mapping.md + 07-platform-specs.md）

**输入**：已完成的小红书发布包
**输出**：5 平台独立 .md 文件 + 错峰排期
- 抖音图文（≤300 字 / 9:16）
- 公众号（1500-2000 字 / 章节小标题）
- 知乎（1500-2500 字 / 问答体）
- 即刻（≤280 字 / 1:1 中文）
- Twitter（≤280 chars / 16:9 英文）

### C. 人设语料库（references/01-persona-template.md + scripts/forbidden_extractor.py）

**输入**：用户 3-5 篇代表作
**输出**：persona-profile.json（8 维度 + forbidden_phrases 自动补全）
**应用**：文案撰写 Step 5.5 自动做人设一致性检查（≥3.5 通过，<3.0 回炉）

## 2 个共享 Utility

### pptx_helpers.py
```python
from pptx_helpers import (
    PALETTE_MAP,              # 4 套调色板
    OVERLAY_COLOR,            # 唯一 source of truth
    embed_cover_image,        # 封面图嵌入函数
    normalize_previous_episodes,  # v1.3.0/v1.3.1 字符串路径兼容
    format_ab_output,         # ab_outputs 列表项
)
```

### forbidden_extractor.py
```python
from forbidden_extractor import extract_forbidden_phrases, check_text

defaults = json.load(open("references/forbidden_defaults.json"))
corpus = [...]  # 3-5 篇代表作文本
persona = json.load(open("references/persona-profile.json"))

effective, breakdown = extract_forbidden_phrases(defaults, corpus, persona)
# breakdown = {"defaults": N, "corpus": N, "user": N, "total": N}

hits = check_text(text, effective)
# word-boundary regex: 不会误命中 "yyds永远的神" 中的 "yyds"
```

## State 契约（references/00-state-schema.md 详细）

**project-state.json** 路径：`projects/{project_id}/project-state.json`

```json
{
  "schema_version": "1.4.1",
  "project_id": "拆书-深度工作",
  "config": { "series": null, "multi_platform": false, "persona_ref": "references/persona-profile.json" },
  "stages": {
    "原文摄入":   { "status": "pending | in_progress | done | blocked", "iterations": 0 },
    "文案撰写":   { "status": "...", "iterations": { "main": 0, "persona": 0, "seeded": 0 }, "persona_score": null },
    "封面插图":   { "status": "...", "placement": "background | top_half | center_float", "ab_outputs": [...] },
    "多平台适配": { "status": "pending | in_progress | done | blocked", "platforms": ["xiaohongshu", "douyin_text", "wechat_oa", "zhihu", "jike", "twitter"] }
  },
  "series_context": { "id": "...", "episode": 3, "total_planned": 8, "previous_episodes": [...], "cross_episode": { "inherit_phrase_seed": "...", "teaser_phrase_seed": "..." } },
  "quality_bar": { "editor_min_score": 3.5, "editor_pass_score": 4.2, "persona_min_score": 3.5 }
}
```

**所有跨 skill 字段名 / 枚举 / 阈值 / 路径的 canonical 来源** = `references/00-state-schema.md` + `scripts/state_io.md` + `schemas/` (机器可校验)。

## 阈值契约（来自 scripts/state_io.md + 00-state-schema.md）

| 阈值 | 值 | 用途 |
|---|---|---|
| `editor_min_score` | 3.5 | 条件通过下限 |
| `editor_pass_score` | 4.2 | 自动通过线 |
| `audience_min_stop_rate` | 0.40 | 停留率自动通过 |
| `audience_ab_test_floor` | 0.45 | 低于此触发 A/B 封面 |
| `audience_no_test_floor` | 0.50 | 高于此跳过 A/B |
| `audience_min_completion_rate` | 0.60 | 完读率自动通过 |
| `persona_min_score` | 3.5 | 人设自动通过 |
| persona_score 中间带 | 3.0-3.5 | 给修改建议 |
| persona_score 重写带 | < 3.0 | 触发文案回炉 |
| 主编 verdict pass | ≥ 4.2 | 自动通过 |
| 主编 verdict conditional | 3.5-4.2 | 条件通过 |
| 主编 verdict rework | 2.8-3.5 | 回炉 |
| 主编 verdict rewrite | < 2.8 | 重写 |

## 平台 ID 枚举（v1.3.0 起 v1.4.1）

```
xiaohongshu | douyin_text | wechat_oa | zhihu | jike | twitter
```

`jike_twitter` 复合值（v1.3.0 早期）已废弃，自动展开。

## 跨期承接句传递（v1.3.3+）

系列项目启动本期时，编排器自动从 Vol.N-1 的 `series_context.cross_episode.teaser_phrase` 复制到本期的 `series_context.cross_episode.inherit_phrase_seed`。**不再用模板占位**，承接句沿系列真实脉络传递。

## 硬规则

- **不留半成品**：任何 P0 问题（审校驳回、pptx 损坏、文案缺字段）必须让上游修好再打包
- **不空跑 persona**：缺 persona-profile.json 时文案撰写 Step 1.5/5.5 跳过，persona_score 写 null
- **不省略平台**：6 平台错峰表任一未生成也要标"未启用"，不删行
- **不擅自 back-compat**：跨期承接句 / 跨平台 ref / iterations 三段计数 等新结构有 back-compat 规则，但不主动改用户 state（用 scripts/migrate_v1_3_to_v1_4.py 显式迁移）
- **不丢失配置**：v1.4.1 起 `config: null` / `status: "skipped"` 在 schema 显式允许（运行时自动视 done + notes）

## 工具链

```bash
# 单测
make test              # 40 pytest

# 校验（建议在 CI 跑）
make validate          # 5 项：frontmatter / JSON / manifest / schedule / pptx self-test
make validate-skills   # 5 项：md 引用 / shared / 字段 / schema / JSON parse

# 重新生成 schedule 表
make render            # scripts/render_schedule_tables.py

# M27 迁移（v1.3.x → v1.4）
make migrate-dry-run   # 看 diff
make migrate-episode-ids  # apply
python3 scripts/migrate_v1_3_to_v1_4.py --rollback  # 后悔药

# 安装到 ClaudeCode plugin dir
rsync -av . ~/.qoderwork/plugins-custom/xiaohongshu-studio/
```

## 与 15-skill plugin 形态对比

| 维度 | 15-skill plugin | mega-skill（本文件）|
|---|---|---|
| 文件数 | 77 | 58 (↓ 25%) |
| SKILL.md 入口 | 15 个分散 | 1 个统一 |
| 单独 stage 调用 | ✓ 可调 `/文案撰写` 等 | ✗ 必须走全流程（或按引用路径调 reference）|
| prompt token | 按调用按需 | 大（首调 ~15K tokens）|
| LLM 编排 | skill loader 自动 | 需在本文件内手动编排 |
| 适用场景 | 频繁单 stage 调 | 一次性端到端跑 |

**选 15-skill**：日常迭代、高频用单 stage、需要 plugin loader 自动编排
**选 mega-skill（本文件）**：单次端到端跑、集成场景、对外分发

## 与 v1.4.1 plugin 同源

本 mega-skill 100% 等价于 15-skill plugin v1.4.1。区别只在文件组织。`xiaohongshu-studio/`（15-skill）与 `xiaohongshu-studio-mega/`（本文件）共享所有契约。

## If Connectors Available

If **知识库** is connected:
- project-state.json / persona-profile.json / publish-history.jsonl 自动同步
- 历史洞察自动推送到选题策划
- 系列 bible 同步到 Notion 数据库

If **任务工具** is connected:
- 每个 stage 建一个 todo，跟踪耗时和迭代次数

If **浏览器** is connected:
- 发布复盘可自动打开小红书创作者后台截图抓数据

无 connector：本地文件驱动。

## 故障排查

| 错误 | 解决 |
|---|---|
| `ModuleNotFoundError: No module named 'pptx'` | `python3 -m pip install --user python-pptx jsonschema pytest` |
| `ModuleNotFoundError: No module named 'jsonschema'` | 同上 |
| `jsonschema.exceptions.ValidationError` | 跑 `make migrate-episode-ids` 升级 state schema 版本 |
| 海报生成 P9 显示占位 | 完成本期 `/发布复盘` 后落地句会自动写回 `series_context.cross_episode.teaser_phrase`，下期会自动引用 |
| 错峰表 6 行有"未启用" | 正常；只启用的平台标"已生成"，未启用的标"未启用" |
| `previous_episodes` 字符串路径崩 | v1.3.3+ 已用 `pptx_helpers.normalize_previous_episodes()` 兼容 |
| 老 state `status: "skipped"` 报错 | v1.4.1 schema 已显式允许；如 schema 校验仍红，升级到 v1.4.1+ |

## 版本

- **v1.4.1**（当前）· 6th self-review 收口：4 P1 + 3 P2 修复。完全向后兼容 v1.2 / v1.3.x。40 pytest 全过。
- 详见 [CHANGELOG.md](CHANGELOG.md) + [UPGRADE.md](UPGRADE.md)。
