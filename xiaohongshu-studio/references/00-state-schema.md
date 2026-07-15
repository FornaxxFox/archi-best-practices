# project-state.json Schema v1.3.4

`编辑部编排` 用来跟踪项目进度的状态文件。每个项目独立一个目录，state 放在项目目录根部。

> **本文件是所有跨 skill 字段名 / 枚举 / 阈值 / 路径的 canonical 来源**。其他文件出现冲突时，以本文件为准。
>
> **机器可校验版本**：[`schemas/project-state.schema.json`](../../../schemas/project-state.schema.json)（JSON Schema Draft 7）。其他相关 schema：
> - [`schemas/persona-profile.schema.json`](../../../schemas/persona-profile.schema.json)
> - [`schemas/series-state.schema.json`](../../../schemas/series-state.schema.json)
> - [`schemas/publish-history-row.schema.json`](../../../schemas/publish-history-row.schema.json)
> - [`schemas/schedule.schema.json`](../../../schemas/schedule.schema.json)
>
> 校验命令：`make validate` 或 `python3 scripts/validate.py`。

---

## 目录结构

```
projects/
└── {project_id}/
    ├── project-state.json   ← 本文件
    ├── series-bible.md      ← v1.3 系列项目用
    ├── series-state.json    ← v1.3.2 批量模式用（schema 见 § series-state.json）
    ├── input/               ← 原文摄入产出
    ├── topics/              ← 选题策划产出
    ├── copy/                ← 文案撰写产出
    ├── assets/              ← 封面插图等资源
    ├── review/              ← 三层审校记录
    └── outputs/             ← 最终交付物
```

`{project_id}` 命名规则： `{类型}-{主题简称}`，**不带 `-vol{N}` 后缀**。Vol 标识存在 `state.series_context.episode`（系列模式）或单期 project 内。

---

## 完整字段（v1.3.2）

```json
{
  "schema_version": "1.3.2",
  "project_id": "string, kebab-case or 中文短标识",
  "project_dir": "projects/{project_id}",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "source_material": "书名 / URL / 一句概要",
  "user_intent": "用户的一句话诉求原文",

  "config": {
    "target_length": 9,
    "style_hint": "auto | 暖调知识风 | 清新种草风 | 深色hook风 | 文艺情绪风",
    "max_iterations_per_stage": 2,
    "cover_image_enabled": true,
    "ab_test_enabled": false,
    "series": null,
    "multi_platform": false,
    "persona_ref": "references/persona-profile.json"
  },

  "stages": {
    "原文摄入": {
      "status": "pending | in_progress | done | blocked",
      "output": "input/xxx-拆解卡.md",
      "iterations": 0,
      "started_at": "...",
      "completed_at": "...",
      "notes": "任何值得记录的"
    },
    "选题策划": {
      "status": "...",
      "output": "topics/xxx-候选选题.md",
      "candidates": 5,
      "selected_angle": 1,
      "selected_output": "topics/xxx-选中角度.md",
      "iterations": 0
    },
    "文案撰写": {
      "status": "...",
      "output": "copy/xxx-发布文案.md",
      "iterations": { "main": 0, "persona": 0, "seeded": 0 },
      "persona_score": null
    },
    "海报生成": {
      "status": "...",
      "output": "outputs/xxx-小红书海报.pptx",
      "style_used": "暖调知识风",
      "iterations": 0
    },
    "封面插图": {
      "status": "...",
      "output": "assets/xxx-cover-image.png",
      "placement": "background | top_half | center_float",
      "prompt_used": "生成时实际使用的 prompt",
      "iterations": 0,
      "ab_outputs": [
        { "variant": "A", "output_path": "assets/xxx-cover-image-A.png", "generated_at": "2026-07-14T10:00:00+08:00" },
        { "variant": "B", "output_path": "assets/xxx-cover-image-B.png", "generated_at": "2026-07-14T10:05:00+08:00" }
      ]
    },
    "责任编辑审校": {
      "status": "...",
      "output": "review/xxx-责编审校.md",
      "verdict": "pass | conditional_pass | reject",
      "iterations": 0
    },
    "主编审阅": {
      "status": "...",
      "output": "review/xxx-主编审阅.md",
      "score": 0.0,
      "dimension_scores": {
        "knowledge_density": 0,
        "originality": 0,
        "logic_closure": 0,
        "style_consistency": 0,
        "aesthetics": 0,
        "rare_expression": 0
      },
      "verdict": "pass | conditional_pass | rework | rewrite",
      "iterations": 0
    },
    "观众视角": {
      "status": "...",
      "output": "review/xxx-观众视角.md",
      "predicted_stop_rate": 0.0,
      "predicted_completion_rate": 0.0,
      "ab_test_recommended": false,
      "iterations": 0
    },
    "发布物打包": {
      "status": "pending | in_progress | done | blocked",
      "output": "outputs/",
      "deliverables": [],
      "iterations": 0
    },
    "发布复盘": {
      "status": "pending | in_progress | done | blocked",
      "output": "review/xxx-发布复盘.md",
      "metrics_recorded": false,
      "triggered_at": null
    },

    "多平台适配": {
      "status": "pending | in_progress | done | blocked",
      "output": "outputs/",
      "platforms": ["xiaohongshu", "douyin_text", "wechat_oa", "zhihu", "jike", "twitter"],
      "iterations": 0
    }
  },

  "quality_bar": {
    "editor_min_score": 3.5,
    "editor_pass_score": 4.2,
    "audience_min_stop_rate": 0.40,
    "audience_ab_test_floor": 0.45,
    "audience_no_test_floor": 0.50,
    "audience_min_completion_rate": 0.60,
    "persona_min_score": 3.5
  },

  "series_context": {
    "id": "深度工作实验室",
    "episode": 3,
    "total_planned": 8,
    "cadence": "weekly_tue",
    "theme_one_liner": "把深度工作从概念拆到工具",
    "bible_path": "projects/拆书-深度工作/series-bible.md",
    "previous_episodes": [
      { "project_id": "拆书-深度工作", "episode": 1 },
      { "project_id": "拆书-深度工作", "episode": 2 }
    ],
    "cross_episode": {
      "inherit_phrase_seed": "上期我们说了 {Vol.2 核心}，这一期把它用起来。",
      "teaser_phrase_seed": "下期我会拆 {Vol.4 副标题}，是这期{关键词}的 X。",
      "inherit_phrase": null,
      "teaser_phrase": null,
      "relation_to_previous": "递进 | 并列 | 反差 | 引申"
    }
  },

  "rework_history": [
    {
      "at": "ISO 8601",
      "triggered_by": "主编审阅",
      "rework_stage": "原文摄入 | 选题策划 | 文案撰写 | 海报生成 | 封面插图 | 多平台适配",
      "reason": "知识密度 2 分",
      "instruction": "补 3 个原文级引用 + 具体数据"
    }
  ]
}
```

---

## 路径解析规则（v1.3.2 新增）

`config.*_ref` 字段值按以下顺序解析：

1. **绝对路径**（`/` 开头）→ 直接使用
2. **相对路径**（不以 `/` 开头）→ 解析为 **workspace 根相对**（不是 project 根）
3. **缺省 / null** → 用字段的 default 值

| 字段 | 默认值 | 说明 |
|---|---|---|
| `config.persona_ref` | `references/persona-profile.json` | 人设语料库输出；缺省时跳过 persona 一致性检查 |
| `config.series.bible_path` | `projects/{project_id}/series-bible.md` | 系列规划产出 |

> 消费者（文案撰写 / 人设语料库）必须按本规则解析 `persona_ref`，不允许自行硬编码 `references/persona-profile.json`。

---

## 阈值契约（v1.3.2 新增 · 单一来源）

| 阈值 | 值 | 用途 | 引用方 |
|---|---|---|---|
| `quality_bar.editor_min_score` | 3.5 | **条件通过**下限（保留旧字段名，含义从 v1.3.2 起变化） | 编排器 gate |
| `quality_bar.editor_pass_score` | 4.2 | **自动通过**线（无需用户 opt-in） | 编排器 gate |
| `quality_bar.audience_min_stop_rate` | 0.40 | 观众首图停留率自动通过线 | 编排器 gate |
| `quality_bar.audience_ab_test_floor` | 0.45 | 低于此值触发 A/B 封面 | 观众视角 |
| `quality_bar.audience_no_test_floor` | 0.50 | 高于此值跳过 A/B 封面 | 观众视角 |
| `quality_bar.audience_min_completion_rate` | 0.60 | 完读率自动通过线 | 编排器 gate |
| `quality_bar.persona_min_score` | 3.5 | persona_score 自动通过线 | 文案撰写 |
| persona_score 中间带 | 3.0–3.5 | 给修改建议，不阻塞 | 文案撰写 |
| persona_score 重写带 | < 3.0 | 触发文案回炉 | 文案撰写 |
| 主编 verdict pass | ≥ 4.2 | 自动通过 | 主编审阅 |
| 主编 verdict conditional | 3.5–4.2 | 条件通过（需 user opt-in） | 主编审阅 |
| 主编 verdict rework | 2.8–3.5 | 回炉 | 主编审阅 |
| 主编 verdict rewrite | < 2.8 | 重写 | 主编审阅 |

> 任何 SKILL.md 出现与本表不一致的数字，必须改正并指向本表。

---

## series_context 字段双写规则（H3 修复 · v1.3.2）

系列模式激活时（`config.series != null`），两处必须同步写入：

- **`config.series`**：legacy v1.3 镜像字段，保留以便 v1.3.x 项目继续工作
- **`series_context`**：v1.3.2 canonical 字段，**所有读操作**默认从这里读

两边字段映射：

| `config.series` | `series_context` |
|---|---|
| `id` | `id` |
| `episode` | `episode` |
| `total_planned` | `total_planned` |
| `cadence` | `cadence` |
| `theme_one_liner` | `theme_one_liner` |
| (无) | `bible_path` |
| (无) | `previous_episodes` |
| (无) | `cross_episode.{inherit_phrase_seed, teaser_phrase_seed, inherit_phrase, teaser_phrase, relation_to_previous}` |

`cross_episode` 字段生命周期：

1. 选题策划产出 `_seed`（种子），写入 angle file + `series_context.cross_episode.{inherit,teaser}_phrase_seed`
2. 文案撰写 落地真实句，写入 `series_context.cross_episode.{inherit,teaser}_phrase`（canonical）
3. 下一期选题策划读 `inherit_phrase`（不是 seed），确保与上期承接

> v1.4 计划：废弃 `config.series` 镜像，单写 `series_context`。

---

## previous_episodes 形状（H4 修复 · v1.3.2）

**对象数组**，不是字符串路径：

```json
"previous_episodes": [
  { "project_id": "拆书-深度工作", "episode": 1 },
  { "project_id": "拆书-深度工作", "episode": 2 }
]
```

`{project_id}` **不**带 `-vol{N}` 后缀；Vol 标识在 `.episode`。

---

## publish-history.jsonl row contract（v1.3.2 唯一来源）

发布复盘 + 选题策划 + 系列化规划 共用此 contract。完整 schema 见 `skills/发布复盘/SKILL.md` Step 4，简要：

```json
{
  "date": "ISO 日期",
  "platform": "xiaohongshu | douyin_text | wechat_oa | zhihu | jike | twitter",
  "title": "笔记标题",
  "topic_band": "拆书 | 教程 | 种草 | 情绪",
  "topic_type": "拆书 | 教程 | 种草 | 情绪 | 清单 | 反常识",
  "viral_structure": "痛点解决 | 反常识 | 干货清单 | 情绪共鸣",
  "palette": "warm_knowledge | fresh_lifestyle | dark_hook | literary_mood",
  "cover_has_image": true,
  "series": { "id": "深度工作实验室", "episode": 3 },
  "persona_score": 4.2,
  "metrics": {
    "impressions": 0,
    "reads": 0,
    "ctr": 0.0,
    "likes": 0,
    "saves": 0,
    "comments": 0,
    "shares": 0,
    "interaction_rate": 0.0,
    "save_like_ratio": 0.0,
    "completion_rate": 0.0
  },
  "verdict": "above_baseline | at_baseline | below_baseline",
  "winning_factors": [],
  "losing_factors": [],
  "next_action": "下一期具体调整建议",
  "cross_platform_ref": {
    "douyin_text": "topic+date key",
    "wechat_oa": "topic+date key"
  }
}
```

**字段说明**：

- `topic_band`（4-way）：用于 CTR 基准线指导，可选
- `topic_type`（6-way）：JSONL 字段，枚举值
- `cross_platform_ref`：对象形状 `{ platform_id: ref_key }`；同主题多平台数据用此字段互引。一条记录 = 一个 (topic, platform) 组合；6 平台 → 6 条记录。
- `persona_score` 缺失时写 `null`（不要写 0）

---

## 平台标识符枚举（H9 修复 · v1.3.2）

```
xiaohongshu | douyin_text | wechat_oa | zhihu | jike | twitter
```

`jike` 和 `twitter` 是**两个独立值**。v1.3.0 出现的复合值 `jike_twitter` 已废弃。

---

## stages 状态机（M18 修复 · v1.3.2）

所有 `stages.*.status` 字段统一 4 值枚举：

```
pending | in_progress | done | blocked
```

包括 `stages.多平台适配` 和 `stages.发布复盘`（v1.3.0 简化的 `{pending, done, skipped}` 已废弃）。

`skipped` 作为状态值**不再使用**——需要"跳过"语义时，把 stage 标为 `done` 并在 `notes` 字段写"skipped: <reason>"。

---

## series-state.json schema（M16 修复 · v1.3.2 · v1.4 episode_id 命名约束）

`series-state.json` 放在 `projects/{project_id}/` 根，与 `project-state.json` 同级。

```json
{
  "schema_version": "1.3.2",
  "series_id": "深度工作实验室",
  "total_planned": 8,
  "episodes": [
    {
      "vol": 1,
      "episode_id": "拆书-深度工作-vol-1",
      "status": "pending | in_progress | done | blocked",
      "output_dir": "projects/拆书-深度工作/outputs/",
      "published_at": "2026-07-15T19:30:00+08:00",
      "publish_history_keys": ["2026-07-15#拆书-深度工作#vol-1"]
    }
  ]
}
```

**v1.4 命名约束（P2 修复）**：`episodes[].episode_id` **必须以 `project_id` 为前缀**（不是 `series_id`）。原因：`episode_id` 用来做发布复盘按 `episode_id` 查行的 lookup key，前缀必须与 `output_dir` 一致。

- ✅ 合法：`"episode_id": "拆书-深度工作-vol-1"`（project_id = 拆书-深度工作）
- ❌ 非法：`"episode_id": "深度工作实验室-vol-1"`（series_id 前缀，发布复盘找不到行）

迁移路径：旧 v1.3.2/v1.3.3 项目用 series_id 前缀的 `episode_id` 会被 `发布复盘 Step 4.8` 自动迁移（按 vol + project_id 重建）。也可手动 `make migrate-episode-ids`（v1.4.0 引入）。

`episodes[].vol` 对应 `state.series_context.episode`；不允许在 project_id 上加 `-vol{N}` 后缀。

---

## 状态机

```
pending → in_progress → done
                    ↘ blocked（需要用户输入）
                    ↘ pending（回炉，iterations +1）
```

## 多项目管理规则

### 项目发现
- 启动时扫描 `projects/` 目录下所有 `project-state.json`
- 按 `updated_at` 降序排列
- 展示给用户时只显示 project_id + 当前 stage + 状态

### 项目创建
- project_id 自动生成：`{类型}-{主题简称}`（**无 `-vol{N}` 后缀**）
  - 类型从用户意图推断：拆书/教程/种草/测评/观点
  - 主题简称取素材核心词，≤8字
- 创建时自动 `mkdir -p` 所有子目录

### 项目续跑
- 找到第一个 status 非 `done` 的 stage，从那里开始
- 如果有 `blocked` 状态，提示用户需要提供什么

### 项目归档
- 所有 stage done + 发布复盘 done → 可归档
- 归档不删除，只在 state 里标记 `"archived": true`

## 使用规则

### 写入时机
- 进入 stage 前：状态改为 `in_progress`，记录 `started_at`
- Stage 完成：状态改为 `done`，记录 `completed_at` + output 路径
- 回炉：状态改回 `pending`，`iterations +1`，同时在 `rework_history` 追加一条
- 封面 A/B：`ab_variant` 记录 `"A"` 或 `"B"`
- persona 回炉：`stages.文案撰写.persona_iterations +1`（与主 `iterations` 分开计数）

### 读取时机
- Orchestrator 启动时：扫描所有项目
- 每 stage 开始前：确认前置 stage 是 `done` 状态
- 断点续跑：找到第一个非 `done` 的 stage，从那里开始

### 并发处理
- Stage 3（文案）和 Stage 4（海报 + 封面插图）可以并行 → 都改成 `in_progress`
- 都完成后再进入 Stage 5

### 系列模式（v1.3 起）

- `config.series != null` 时激活
- 优先从 `series_context` 读，回退到 `config.series`（legacy v1.3 镜像）
- `previous_episodes` 是对象数组，每项 `{project_id, episode}`；v1.3.0/1.3.1 字符串路径形式也兼容（运行时 normalize 到对象）
- `cross_episode.inherit_phrase` / `teaser_phrase` 由文案撰写落地（canonical），下一期选题策划读它
- 系列项目完成后，写入 `series-state.json` 标记本期为 `done`

### 批量模式（v1.3 起）

- 用户说"跑完整个排期表" → 激活
- 顺序执行所有期（**不并行**——避免 persona 状态在并发中漂移）
- 每期完成后更新 `series-state.json` 的对应 vol

### cover_image_enabled 跳过规则（M21 修复 · v1.3.2）

- Orchestrator Rule 1：进入 `封面插图` stage 之前先检查 `config.cover_image_enabled`
- 值为 `false` → 直接把 `stages.封面插图.status` 设为 `done`，在 `notes` 写 "skipped: cover_image_enabled=false"
- 不调用 [封面插图] skill，避免空跑

## 字段向后兼容

| 旧版字段 | v1.3.2 行为 |
|---|---|
| `config.series` 缺失 / null | 走单期模式，行为完全不变 |
| `series_context` 缺失 | 同上 |
| `stages.多平台适配` 缺失 | 视为 `done`（不调用） |
| `quality_bar.editor_min_score` 缺失 | 默认 3.5（条件通过） |
| `quality_bar.editor_pass_score` 缺失 | 默认 4.2（自动通过） |
| `quality_bar.persona_min_score` 缺失 | 默认为 3.5 |
| `persona-profile.json` 缺失 | 文案撰写 Step 1.5 / 5.5 跳过，persona_score 写 null |
| `historical-insights.md` 缺失 | 发布复盘首次跑会创建；样本 < 3 不生成 Top 3 |
| `series-state.json` 缺失 | 视为未启用批量模式 |
| `stages.*.status` 是 v1.3 简化值（如 `skipped`） | 视为 `done` + 写 notes |
| `stages.多平台适配.platforms` 含 `"jike_twitter"`（v1.3.0 复合值） | **v1.3.3 映射**：`"jike_twitter"` → `["jike", "twitter"]`；一次性迁移，写回 state |
| `series_context.previous_episodes` 是字符串路径数组（v1.3.0/1.3.1） | **v1.3.3 兼容**：`previous_episodes: ["projects/...-vol2"]` 视为 `[{project_id: "拆书-深度工作", episode: 2}]`；不修改原值 |
| `stages.封面插图.ab_variant` 是单字符串 v1.3.0/v1.3.1 形式 | **v1.3.3 兼容**：读取时视为 v1.3.2 enum "A"\|"B"\|null；新写时同步 v1.3.2 形式 |
| `stages.文案撰写.iterations` 是单 int v1.3.0/1.3.1/1.3.2 形式 | **v1.3.3 兼容**：读取时视为 `{main: int, persona: 0, seeded: 0}`；新写时拆为对象 |
| `series-state.json` 缺 `episode_id` 字段 | **v1.3.3 兼容**：回退为 `{project_id}-vol-{vol}` 构造 |

**所有 v1.2 / v1.3 / v1.3.1 / v1.3.2 项目可平滑升级到 v1.3.3**——旧 state 文件不需要迁移。

## 全局共享资源

以下资源跨项目共享，放在工作目录根部（不在 projects/ 内）：

```
references/
├── publish-history.jsonl            ← 发布复盘追加写入（v1.3.2 完整 schema 见上）
├── historical-insights.md           ← 发布复盘定期整理（v1.3.2 起为 live 数据主路径）
├── persona-profile.json             ← v1.3 起人设语料库写入
└── persona-profile.example.json     ← 默认模板
```

`skills/选题策划/references/historical-insights.md` 仅为 schema 参考文件，不是 live 数据。live 数据在 workspace 根的 `references/historical-insights.md`。

选题策划、人设语料库、发布复盘在执行时自动读取这些全局数据。
