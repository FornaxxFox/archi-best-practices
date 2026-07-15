# state_io.md · v1.3.4 状态 IO 共享契约

> **本文件是所有跨 skill 状态 IO 规则的 canonical 来源**。其他文件（state-schema.md / SKILL.md）出现冲突时以本文件 + schemas/*.schema.json 为准。

---

## 路径解析规则

`config.*_ref` 字段值按以下顺序解析：

1. **绝对路径**（`/` 开头）→ 直接使用
2. **相对路径**（不以 `/` 开头）→ 解析为 **workspace 根相对**（不是 project 根）
3. **缺省 / null** → 用字段的 default 值

| 字段 | 默认值 | 说明 |
|---|---|---|
| `config.persona_ref` | `references/persona-profile.json` | 人设语料库输出；缺省时跳过 persona 一致性检查 |
| `config.series.bible_path` | `projects/{project_id}/series-bible.md` | 系列规划产出 |

**消费者必须按本规则解析**；不允许硬编码路径。

---

## 状态机（stages 通用）

```
pending → in_progress → done
                    ↘ blocked（需要用户输入）
                    ↘ pending（回炉，iterations +1）
```

所有 `stages.*.status` 字段统一 4 值枚举：

```
pending | in_progress | done | blocked
```

`skipped` 作为状态值**不再使用**——需要"跳过"语义时，把 stage 标为 `done` 并在 `notes` 字段写"skipped: <reason>"。

---

## 阈值契约（单一来源）

| 阈值 | 值 | 用途 | 引用方 |
|---|---|---|---|
| `quality_bar.editor_min_score` | 3.5 | **条件通过**下限 | 编排器 gate |
| `quality_bar.editor_pass_score` | 4.2 | **自动通过**线 | 编排器 gate |
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

## series_context 字段双写规则

系列模式激活时（`config.series != null`），两处必须同步写入：

- **`config.series`**：v1.3 镜像字段，保留以便 v1.3.x 项目继续工作
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
| (无) | `cross_episode.{...}` |

> v1.4 计划：废弃 `config.series` 镜像，单写 `series_context`。

---

## previous_episodes 形状

**v1.3.2+ 对象数组**：

```json
"previous_episodes": [
  { "project_id": "拆书-深度工作", "episode": 1 },
  { "project_id": "拆书-深度工作", "episode": 2 }
]
```

**v1.3.0/v1.3.1 字符串路径**（v1.3.3 兼容）：

```json
"previous_episodes": [
  "projects/拆书-深度工作-vol1",
  "projects/拆书-深度工作-vol2"
]
```

`{project_id}` **不**带 `-vol{N}` 后缀；Vol 标识在 `.episode`。

`pptx_helpers.normalize_previous_episodes()` 在 v1.3.3+ 自动 normalize；不修改原值。

---

## publish-history.jsonl row contract

发布复盘 + 选题策划 + 系列化规划 共用此 contract。完整 schema 见 [`schemas/publish-history-row.schema.json`](../../../schemas/publish-history-row.schema.json)。

字段摘要：
- `topic_band`（4-way enum）：用于 CTR 指导
- `topic_type`（6-way enum）：JSONL 字段
- `cross_platform_ref`：对象形状 `{ platform_id: ref_key }`
- 一条记录 = 一个 (topic, platform) 组合；6 平台 → 6 条记录

`persona_score` 缺失时写 `null`（不要写 0）。

---

## 平台标识符枚举

```
xiaohongshu | douyin_text | wechat_oa | zhihu | jike | twitter
```

`jike` 和 `twitter` 是**两个独立值**。v1.3.0 复合值 `jike_twitter` 已废弃（v1.3.3 自动展开为 `["jike", "twitter"]`）。

---

## 字段向后兼容

| 旧版字段 | v1.3.4 行为 |
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
| `stages.多平台适配.platforms` 含 `"jike_twitter"` | v1.3.3 一次性映射为 `["jike", "twitter"]` |
| `series_context.previous_episodes` 是字符串路径数组 | v1.3.3 运行时 normalize 为对象数组 |
| `stages.封面插图.ab_variant` 是单字符串 | v1.3.3 视为 enum "A"\|"B"\|null |
| `stages.文案撰写.iterations` 是单 int | v1.3.3 视为 `{main, persona, seeded}` |
| `series-state.json` 缺 `episode_id` | v1.3.3 回退 `{project_id}-vol-{vol}` 构造 |

**所有 v1.2 / v1.3 / v1.3.1 / v1.3.2 / v1.3.3 项目可平滑升级到 v1.3.4**。

---

## 全局共享资源位置

```
references/
├── publish-history.jsonl            ← 发布复盘追加写入
├── historical-insights.md           ← 发布复盘定期整理
├── persona-profile.json             ← 人设语料库写入
├── persona-profile.example.json
├── schedule.json                    ← 6 平台错峰时间 canonical
└── (其他未来加入的全局资源)

schemas/                              ← 机器可校验 schema
├── project-state.schema.json
├── persona-profile.schema.json
├── series-state.schema.json
├── publish-history-row.schema.json
└── schedule.schema.json

skills/_shared/                       ← 跨 skill 共享代码
├── pptx_helpers.py                   ← 调色板 + 封面嵌入 + 兼容性 normalizer
└── state_io.md                       ← 本文件
```
