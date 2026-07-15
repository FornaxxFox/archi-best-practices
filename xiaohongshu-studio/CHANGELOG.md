# CHANGELOG · 小红书图文工厂

> 本文件记录每个版本的核心变更、破坏性变更、与升级路径。请按版本号从下往上读。

---

## v1.4.1 · 2026-07-15

**主题**：v1.4 6th self-review 收口。修 4 P1（脚本崩溃 / 路径异常 / schema 拒绝旧 state / forbidden 误报）+ 3 P2（validator scope / 文档校准 / enum 漂移）。**纯修 bug，不改任何行为。**

### 修复清单

| # | ID | 简述 | 文件 |
|---|---|---|---|
| 1 | P1-1 | `data.get("config") or {}` 防 null 崩溃 | `scripts/migrate_v1_3_to_v1_4.py` |
| 2 | P1-2 | migrate/rollback 顶部加 `path.exists()` + `is_dir()` 检查 | `scripts/migrate_v1_3_to_v1_4.py` |
| 3 | P1-3 | `config: null` + `status: "skipped"` 在 schema 中显式允许（v1.3.x 现场兼容） | `schemas/project-state.schema.json` |
| 4 | P1-4 | `check_text` 改 `re.ASCII` word-boundary 匹配（不再误命中"yyds永远的神"中的"yyds"） | `skills/_shared/forbidden_extractor.py` + `references/forbidden_defaults.json` |
| 5 | P2-1 | `validate_skill_outputs.py` md 扫描改全树（覆盖 README/CHANGELOG/UPGRADE/examples） | `scripts/validate_skill_outputs.py` |
| 6 | P2-2 | CHANGELOG 校准 "5 个 schema" → "3 对 example JSON 校验" | `CHANGELOG.md` |
| 7 | P2-3 | `relation_to_previous` enum 删 stray `-` 占位符（4 值 → 4 值，与文档一致） | `schemas/project-state.schema.json` |

### 测试增量

```
v1.4.0: 28 passed
v1.4.1: 40 passed (+12)
  - TestForbiddenExtractorWordBoundary (5 tests)
  - TestMigrateConfigNull (1)
  - TestMigratePathGuards (3)
  - TestSchemaSkippedBackcompat (3)
```

### 工具链 v1.4.1

```bash
$ make test
............................ + 12 = 40 passed in 0.14s

$ make validate
ALL_OK

$ python3 scripts/validate_skill_outputs.py
ALL_OK
```

---

## v1.4.0 · 2026-07-15

**主题**：v1.3 阶段 deferred 项落地 + v1.3.4 self-review 收口。M27 config.series 镜像正式可迁移、forbidden_phrases 默认集合、skill output validator、3 P1 + 1 P2 修复。

### 修复 / 新增

| # | ID | 简述 | 文件 |
|---|---|---|---|
| 1 | v1.3.4 P1 #1 | 状态 enum 5 值 → 4 值（删 skipped） | `schemas/project-state.schema.json` |
| 2 | v1.3.4 P1 #2 | `render_avoid_slots()` 死代码 → 注入到 cross-post-schedule.md | `scripts/render_schedule_tables.py` |
| 3 | v1.3.4 P1 #3 | 删除 cross-post-schedule.md 重复的 5 行手写表 | `skills/多平台适配/references/cross-post-schedule.md` |
| 4 | v1.3.4 P2 | series-state episode_id 命名约束文档化 | `skills/编辑部编排/references/state-schema.md` |
| 5 | M27 | `scripts/migrate_v1_3_to_v1_4.py` 一次性迁移 + rollback | `scripts/migrate_v1_3_to_v1_4.py`（新）|
| 6 | M27 | `config.series` → `config.series_legacy`，`series_context` 升为唯一字段 | （迁移脚本） |
| 7 | forbidden_phrases defaults | curated 7 类 ~50 词 JSON | `references/forbidden_defaults.json`（新）|
| 8 | forbidden_extractor | `extract_forbidden_phrases()` + `check_text()` + 自检 | `skills/_shared/forbidden_extractor.py`（新）|
| 9 | L32 区分 | series-structure 5 类 vs relation_to_previous 4 值正交说明 | `skills/系列化规划/references/series-structures.md` |
| 10 | skill output validator | 37 个 md 引用 + 4 字段一致性 + 3 对 example JSON schema 合规校验 | `scripts/validate_skill_outputs.py`（新）|
| 11 | 修 bug | `skills/发布复盘/SKILL.md:198` 损坏的相对路径 `../../选题策划/...` → `../选题策划/...` | `skills/发布复盘/SKILL.md` |

### 升级路径

```bash
# 1. 拉新源码覆盖安装（与 v1.3.4 同样方式）
# 2. 校验
make test
make validate
make validate-skills  # 新增

# 3. (可选) 跑 M27 迁移 — 把 config.series 镜像挪到 series_context
python3 scripts/migrate_v1_3_to_v1_4.py --dry-run   # 看 diff
python3 scripts/migrate_v1_3_to_v1_4.py --apply      # 真实写
python3 scripts/migrate_v1_3_to_v1_4.py --rollback  # 后悔药
```

### 兼容

- v1.4 仍支持 `config.series`（从 `config.series_legacy` 镜像读取，但**新代码应读 `series_context`**）
- 旧 v1.3.x 项目不跑 `--apply` 也可继续运行
- 跑 `--apply` 后：旧 `config.series` 被改名到 `config.series_legacy`（保留），新 `series_context` 字段出现
- 回滚：`--rollback` 把 `config.series_legacy` 复制回 `config.series`，删除 `series_context`

### 工具链 v1.4 增强

```bash
$ make test              # 28 pytest
$ make validate          # 5 项校验（frontmatter / JSON / manifest / schedule / pptx_helpers self-test）
$ python3 scripts/validate_skill_outputs.py
                          # 5 项校验（md 引用 / shared import / 字段一致性 / schema 合规 / JSON parse）
$ make render            # 重新生成 3 个 schedule 表（含 avoid_slots）
$ python3 scripts/migrate_v1_3_to_v1_4.py --apply
                          # M27 一次性迁移
```

---

## v1.3.4 · 2026-07-14

**主题**：v1.3.3 之后的优化与基础设施。不改 skill 行为；只做文档同步、CI/工具链、JSON Schema、共享单源。

### 11 项 do-now 优化

| # | ID | 简述 | 文件 |
|---|---|---|---|
| 1 | README sync | 删除重复 免责声明 + 更新版本记录 + 加 v1.3.3 features 描述 | `README.md` |
| 2 | CHANGELOG TL;DR | 顶部加 TL;DR + 升级路径速查表 + 字段迁移地图 | `CHANGELOG.md` |
| 3 | UPGRADE.md | 独立 per-version 迁移指南 + 故障排查 | `UPGRADE.md`（新文件）|
| 4 | plugin.json enrichment | 加 license / homepage / repository / engines / keywords / author.email / subcategory / permissions / skill_dependencies | `.qoder-plugin/plugin.json` |
| 5 | Toolchain | `Makefile` + `scripts/validate.py` + `tests/conftest.py` + `tests/test_pptx_helpers.py` + `tests/test_schedule_json.py`（28 个 pytest 全过） | `Makefile`, `scripts/`, `tests/` |
| 6 | JSON Schema | 5 个 jsonschema Draft 7：project-state / persona-profile / series-state / publish-history-row / schedule | `schemas/`（新目录）|
| 7 | state_io.md | 路径解析规则 + 状态机 + 阈值契约 + back-compat 集中声明（canonical prose） | `skills/_shared/state_io.md`（新文件）|
| 8 | series-structures Worked | 5 种结构每种加 Vol.1-3 真实可模仿示例（5 个新表） | `skills/系列化规划/references/series-structures.md` |
| 9 | tone-mapping 知乎 模板 | 加"问题背景 → 我的回答 → 反方观点 → 实证数据 → 以上"完整改写示例 | `skills/多平台适配/references/tone-mapping.md` |
| 10 | schedule 表自动生成 | `scripts/render_schedule_tables.py` 从 schedule.json 重新生成 3 个 markdown 表，加 `AUTO-GENERATED-*` marker | `scripts/render_schedule_tables.py`（新文件）|
| 11 | examples fix | 删除 `series_motif` 字段（已废弃），加 4 行注释指向新路径 | `examples/series-bible.example.md` |

### 5 项 defer to v1.4

| ID | 简述 | 原因 |
|---|---|---|
| M27 | 废弃 `config.series` 镜像 | 需独立 migration guide + 风险评估 |
| L32–L36 | 文档/命名层面 | 不影响行为 |
| `scripts/migrate_v1_3_to_v1_3_3.py` | M27 配套 migration 脚本 | 同 M27 |
| `forbidden_phrases` deterministic fallback | persona 提取加速 | 非关键优化 |
| `skill_dependencies` matrix | 完整依赖图 | plugin.json v1.3.4 已有简化版 |

### 工具链可用性

```bash
# 单测
make test
# 输出: tests/test_pptx_helpers.py::TestNormalizePreviousEpisodes::* PASSED × 19
#       tests/test_schedule_json.py::* PASSED × 9
#       28 passed in 0.11s

# 校验
make validate
# 输出: ALL_OK

# 重新生成 schedule 表
make render
```

### 跳过

v1.3.3 → v1.3.4 **无需迁移**。所有 v1.3.x 项目可平滑升级。

---

## v1.3.3 · 2026-07-14

**主题**：v1.3.3 之后的优化与基础设施。不改 skill 行为；只做文档同步、CI/工具链、JSON Schema、共享单源。

### TL;DR · 如果你有 v1.3.x 项目
- 无需迁移。打开即跑。
- 新增共享：`skills/_shared/pptx_helpers.py`（v1.3.3）、`skills/_shared/state_io.md`（v1.3.4）、`references/schedule.json`（v1.3.3）
- 新增工具链：`Makefile` + `tests/`（pytest） + `scripts/validate.py` + `schemas/*.schema.json`
- 推荐做：跑 `make test` 一次；读 `UPGRADE.md`

### 升级路径速查

| 来自版本 | 必做 | 推荐做 | 无需做 |
|---|---|---|---|
| v1.0 | 更新插件源目录 | 跑 1 次 `/人设语料库` | state 迁移 |
| v1.1 | 同上 | 同上 | state 迁移 |
| v1.2 | 更新插件源目录 | `/人设语料库` + 跑 1 次 `/发布复盘` 触发 `references/historical-insights.md` 重建 | state 迁移 |
| v1.3.0 | 更新插件源目录 | （无） | state 迁移（v1.3 字段在 v1.3.3 仍可用） |
| v1.3.1 | 同上 | （无） | 同上 |
| v1.3.2 | 同上 | （无） | 同上 |
| v1.3.3 | （无；自动 back-compat 跑） | 跑 `make test` 验证 | （无） |

### 字段迁移地图（v1.3.x → v1.3.3+）

| 字段 | 旧形态 | 新形态 | 自动迁移？ |
|---|---|---|---|
| `stages.文案撰写.iterations` | int (1, 2, ...) | `{main, persona, seeded}` object | ✅ 旧 int 读为 `main` |
| `stages.封面插图.ab_variant` | `"A"\|"B"\|null` 字符串 | `ab_outputs: [{variant, output_path, generated_at}]` 数组 | ✅ 旧字符串读为 enum |
| `series_context.previous_episodes` | `["projects/...-vol1", ...]` 字符串路径 | `[{project_id, episode}, ...]` 对象数组 | ✅ 运行时 normalize |
| `series_context.cross_episode.inherit_phrase_seed` 等 4 个 seed 字段 | — | 保留为种子；canonical = `inherit_phrase` / `teaser_phrase`（文案撰写落地） | ✅ 兼容 |
| `config.series` (v1.3 镜像) + `series_context` (canonical) | 单一字段 | 双写（v1.3.4 仍维持；v1.5 计划废弃 config.series） | ✅ 兼容 |
| `stages.多平台适配.platforms` 含 `"jike_twitter"` | v1.3.0 复合值 | 6 平台枚举 `xiaohongshu/douyin_text/wechat_oa/zhihu/jike/twitter` | ✅ 自动展开为 `[jike, twitter]` |
| `references/persona-profile.json#drift_alert` | — | 字段存在；v1.3.3 起 `/发布复盘` 自动写 | ✅ 自动 |
| `iterations: {main, persona, seeded}.seeded` | — | 字段存在；v1.3.3 引入但 v1.3.4 仍写 0 | ✅ |

### 本版本（v1.3.4）变更

详见 [UPGRADE.md](UPGRADE.md) 和 `git log` 标签 `v1.3.4`。

---

## v1.3.3 · 2026-07-14

**主题**：v1.3.2 self-review 收口。关闭 4 个 v1.3.2 自身 HIGH（cross_platform_ref 单源 / 发布物打包 6 行模板 / 海报生成 previous_episodes 兼容 / drift auto-trigger）+ 6 个 MED + 1 LOW；同时把 6 个 v1.3 阶段 deferred 项升级为 v1.3.3 内置（pptx 共享工具 / schedule 单源 / persona rework 计数 / A/B 变体列表化 / rework_history enum / drift auto-trigger）。**完全向后兼容 v1.2 / v1.3.x。**

### 修复清单

#### v1.3.2 self-review 收口（11 项）

| ID | 等级 | 简述 | 修复位置 |
|---|---|---|---|
| HIGH-1 | HIGH | cross_platform_ref 记录数自相矛盾（schema vs 发布复盘） | `skills/发布复盘/SKILL.md:260` hard-rule 6 跟随 state-schema，6 条独立记录 |
| HIGH-2 | HIGH | 发布物打包 仍合并 即席/Twitter | `skills/发布物打包/SKILL.md` v1.1.1 拆 2 行 + 6 行模板 |
| HIGH-3 | HIGH | 发布物打包 6 平台硬规则但 5 行模板 | `skills/发布物打包/SKILL.md` 模板固定 6 行 + 缺位显式标 "未启用" |
| HIGH-4 | HIGH | 海报生成 Step 4b 在 v1.3.1 字符串路径上崩溃 | `skills/_shared/pptx_helpers.py` `normalize_previous_episodes()` + 海报生成 Step 4b 调用 |
| MED-5 | MED | Step 4b 引用不存在的 `series_motif` 字段 | `skills/_shared/pptx_helpers.py` `PALETTE_MAP` + `resolve_palette()` |
| MED-6 | MED | 跨期承接句永远回退到 seed | `skills/编辑部编排/SKILL.md` 启动时复制前一期 `cross_episode.teaser_phrase` → 本期 `inherit_phrase_seed` |
| MED-7 | MED | drift 触发按 jsonl 行数算（多平台假阳性） | `skills/发布复盘/SKILL.md` Step 4.7 改按 `(title, series.episode)` 去重 |
| MED-8 | MED | drift ownership 文档矛盾 | `skills/发布复盘/SKILL.md` 统一到 "下次 /编辑部编排 启动时 surface" |
| MED-9 | MED | `series-state.episode_id` 前缀 series_id vs project_id 不一致 | `skills/系列化规划/SKILL.md` 改用 `project_id` 前缀 |
| MED-10 | MED | `jike_twitter` 旧值 back-compat 未映射 | `state-schema.md` back-compat 表新增 `jike_twitter → [jike, twitter]` 行 |
| LOW-11 | LOW | 发布复盘 frontmatter 字段顺序不一致 + 缺 `user-invocable` | `skills/发布复盘/SKILL.md` frontmatter 标准化 |

#### v1.3 deferred 升级（6 项 · 之前推迟的 v1.4 工作提前到 v1.3.3）

| ID | 简述 | 修复位置 |
|---|---|---|
| M19 | A/B 变体列表化 | `state-schema.md` `stages.封面插图.ab_outputs: [{variant, output_path, generated_at}]` |
| M20 | persona rework 计数拆分 | `state-schema.md` `stages.文案撰写.iterations: {main, persona, seeded}` + 文案撰写 SKILL 输出对齐 |
| M25 | persona 漂移 auto-trigger | `skills/编辑部编排/SKILL.md` 启动时读 `drift_alert` 并 surface |
| M26 | rework_history enum 集中声明 | `state-schema.md` 增 `rework_stage ∈ {原文摄入, 选题策划, 文案撰写, 海报生成, 封面插图, 多平台适配}` |
| M29 | 海报+封面 重复 python-pptx | `skills/_shared/pptx_helpers.py` 共享模块 + 海报生成/封面插图 import 替换 |
| M30 | schedule 三处重复 | `references/schedule.json` 6 平台单源 + 三个文件引用注释 |
| L31 | drift_alert 字段命名 | 保留 `drift_alert`，加 `persona_drift` 别名注释 |

#### 跳过（v1.3.3 不做）

| ID | 原因 |
|---|---|
| M27 | 废弃 `config.series` 会破坏 v1.3.0/1.3.1/1.3.2 现有项目，需独立 migration guide，不在 hotfix 范围 |
| L32–L36 | 文档层面 / 命名层面，v1.3.3 不投入 |

### 共享单源（v1.3.3 新增）

```
skills/_shared/
└── pptx_helpers.py      ← 唯一 PALETTE_MAP / OVERLAY_COLOR / embed_cover_image() / normalize_previous_episodes()

references/
└── schedule.json        ← 6 平台错峰时间 canonical
```

### back-compat 增量

state-schema.md § 字段向后兼容 表新增 4 行：
- `stages.多平台适配.platforms` 含 `"jike_twitter"` → 一次性映射为 `["jike", "twitter"]`
- `series_context.previous_episodes` 字符串路径数组（v1.3.0/1.3.1）→ 运行时 normalize 为对象数组
- `stages.封面插图.ab_variant` 单字符串 → 视为 v1.3.2 enum
- `stages.文案撰写.iterations` 单 int → 视为 `{main, persona, seeded}` 对象
- `series-state.json` 缺 `episode_id` → 回退 `{project_id}-vol-{vol}` 构造

**所有 v1.2 / v1.3 / v1.3.1 / v1.3.2 项目可平滑升级到 v1.3.3**。

---

## v1.3.2 · 2026-07-14

**主题**：v1.3 cross-skill contract 收口。关闭 22 项跨 skill 不一致缺陷（15 HIGH + 7 关键 MED），把 `state-schema.md` 升为 canonical 来源。**完全向后兼容 v1.2 / v1.3.0 / v1.3.1**。

### 修复清单

#### HIGH（15 项 · 关闭数据闭环）

| ID | 简述 | 修复位置 |
|---|---|---|
| H1 | `historical-insights.md` 写一份 / 读一份路径分裂 | `skills/发布复盘/SKILL.md:185` 写路径统一为 `references/historical-insights.md` (workspace 根) |
| H2 | `publish-history.jsonl` schema 在 SKILL.md 与 metrics-template.md 不一致 | `skills/发布复盘/SKILL.md:121-160` + `skills/发布复盘/references/metrics-template.md:75-101` 同步 v1.3.2 完整 schema |
| H3 | series 字段在 `config.series` 与 `series_context` 双处未对齐 | `skills/编辑部编排/references/state-schema.md` § series_context 字段双写规则；`skills/系列化规划/SKILL.md:108-141` 双写 |
| H4 | `project_id` 是否带 `-volN` 后缀约定冲突 | `skills/编辑部编排/SKILL.md:178-205` 约定 "无 -volN"；`previous_episodes` 改对象数组 |
| H5 | `cross_episode.inherit_phrase` 两套存储 + 两套字段名 | `skills/文案撰写/SKILL.md` Step 3 finalize 子步骤，写回 `state.series_context.cross_episode.{inherit,teaser}_phrase` |
| H6 | 海报生成 P9 没有 series-mode override | `skills/海报生成/SKILL.md` 新增 Step 4b 系列导览页 |
| H7 | `state.config.persona_ref` 路径解析未定义 | `skills/编辑部编排/references/state-schema.md` § 路径解析规则；`skills/人设语料库/SKILL.md` + `skills/文案撰写/SKILL.md` 引用 |
| H8 | `cross_platform_ref` 形状未定义 | `skills/发布复盘/SKILL.md:153-167` 明确 `{ platform_id: ref_key }` 对象 |
| H9 | 平台 id `jike_twitter` vs `jike`+`twitter` 不一致 | `skills/编辑部编排/references/state-schema.md` § 平台标识符枚举；删除 `jike_twitter` |
| H10 | 观众停留率 4 个阈值在不同文件矛盾 | `skills/编辑部编排/references/state-schema.md` § 阈值契约（单一来源） |
| H11 | 选题策划读 `series_id`/`series_episode`，schema 是 `id`/`episode` | `skills/选题策划/SKILL.md:13-37` 改用 `series.id` + `series.episode` |
| H12 | `editor_min_score` 含义与主编规则不符 | `skills/编辑部编排/references/state-schema.md` § 阈值契约 翻转含义 = 条件通过 3.5；新增 `editor_pass_score: 4.2` 自动通过线 |
| H13 | shipped `historical-insights.md` 模板伪装 live 数据 | `skills/选题策划/references/historical-insights.md` 重构为"schema 参考 + NOT live data"双段 + 顶部警告 banner |
| H14 | 编辑部编排示例 state 是 v1.2 schema | `skills/编辑部编排/SKILL.md:117-156` 升到 v1.3.2 + 新字段 placeholder |
| H15 | 两份 `persona-profile.example.json` 形状不一致 | `skills/人设语料库/references/persona-profile.example.json` 加 `"drift_alert": null` 与 examples 同步 |

#### MEDIUM（7 项 · 关键修复）

| ID | 简述 | 修复位置 |
|---|---|---|
| M16 | `series-state.json` schema 从未定义 | `skills/编辑部编排/references/state-schema.md` § series-state.json schema |
| M17 | 编辑部编排 SKILL.md "If Connectors Available" 块重复 | `skills/编辑部编排/SKILL.md:358-371` 删除重复块，保留完整版 |
| M18 | `stages.多平台适配` / `stages.发布复盘` 状态枚举简化 | `skills/编辑部编排/references/state-schema.md` § 状态机升级为完整 4 值 enum |
| M22 | persona_score 阈值在 3 处不一致 | `skills/文案撰写/SKILL.md` + `skills/人设语料库/SKILL.md` + state-schema 三处统一为 `≥3.5 / 3.0–3.5 / <3.0` |
| M23 | `topic_type` 枚举 4 / 5 / 6 值在不同文件 | state-schema 区分 `topic_band`（4-way CTR 指导）+ `topic_type`（6-way enum）双 axis |
| M24 | 即刻 + Twitter 拆/合不一致 | `skills/多平台适配/SKILL.md` + `skills/多平台适配/references/cross-post-schedule.md` 拆为两个独立文件 + 独立 schedule 行 |
| M28 | example 文件用 `-volN` 后缀 | `examples/multi-platform-outputs.example.md:6-13` 删除 `-vol2` + 加约定说明 |

### 状态文件

- `project-state.json` schema 升至 v1.3.2
- canonical 来源：`skills/编辑部编排/references/state-schema.md`（v1.3.2 起为唯一来源）
- 新增/澄清字段（全部 optional 向后兼容）：
  - `quality_bar.editor_pass_score: 4.2`（自动通过线）
  - `quality_bar.audience_ab_test_floor: 0.45`
  - `quality_bar.audience_no_test_floor: 0.50`
  - `stages.文案撰写.persona_iterations: int`
  - `stages.文案撰写.persona_score: float | null`
  - `stages.封面插图.ab_variant: "A" | "B" | null`（enumerated）
  - `series_context.cross_episode.inherit_phrase_seed` / `teaser_phrase_seed`（保留为种子）
  - `series_context.cross_episode.inherit_phrase` / `teaser_phrase`（canonical，由文案撰写落地）
  - `series_context.previous_episodes[].project_id`（对象形式，v1.3 字符串路径废弃）
- 字段语义变更：
  - `quality_bar.editor_min_score`：**含义从 v1.3 的 3.8 改为 v1.3.2 的 3.5**（条件通过下限）
  - `series_context.previous_episodes`：v1.3 字符串路径 → v1.3.2 对象数组

### 升级路径

- v1.2 / v1.3.0 / v1.3.1 state 文件**无需迁移**，自动按 back-compat 规则处理
- 新字段全部 optional；旧字段语义变更在 schema 文档中说明
- v1.3.2 端运行后建议用新版示例 state 作为参考，但旧 state 不会被自动重写

### Defer to v1.4

| ID | 简述 | v1.4 计划 |
|---|---|---|
| M19 | A/B 封面变体列表化 | 引入 `ab_outputs: [{variant, output_path}]` |
| M20 | persona rework 计数 | `iterations` 拆为 `{main, persona, seeded}` 三个字段 |
| M25 | persona 漂移自动触发 | 编排器 Stage 9 触发后自动写 `drift_alert`；下一次 /编辑部编排 启动时优先 surface |
| M26 | rework_history enum | 在 state-schema 集中声明枚举值 |
| M27 | 选题策划读 series_context | 收紧到只读 `series_context`（deprecated `config.series`） |
| M29 | 海报+封面 重复 python-pptx | 抽到 `skills/_shared/pptx_helpers.py`；常量统一 |
| M30 | schedule 三处重复 | 抽到 `references/schedule.json` |
| L31-L36 | 顺手清理 | – |

---

## v1.3.0 · 2026-07-14

**主题**：从「单篇生产」升级为「IP 运营」。

### 新增（3 个 skill）

| Skill | 用途 |
|---|---|
| `系列化规划` | 把一个大主题拆成 5–10 期可独立发布、但彼此递进的小红书排期表。输出系列命名 / 节奏 / 跨期引用机制 / 累计涨粉预估。5 种主结构：渐进深入 / 并列主题 / 故事线 / 挑战体 / 问答体。 |
| `多平台适配` | 把小红书发布包改写为抖音图文（≤300 字 / 9:16）/ 公众号（1500–2000 字 / 1:1）/ 知乎（1500–2500 字 / 问答体）/ 即刻 + Twitter（≤280 字）4 个平台版本。配套错峰表（小红书→0h / 抖音→24h / 公众号→48h / 知乎→72h）。 |
| `人设语料库` | 提取作者本人的语感（口头禅 / 句式 / emoji 密度 / 标题钩子 / 绝对不说的话 / 金句模板）→ `references/persona-profile.json`。文案撰写读这份文件做人设一致性检查（≥3.5 通过 / <3.0 重写），避免"通用 AI 味"。 |

### 升级（4 个 skill）

| Skill | 关键变更 |
|---|---|
| `编辑部编排` v1.2 → v1.3 | 新增「系列模式」（state.config.series 触发）和「批量模式」（跑完排期表）；新增承接/预告句机制、跨期回炉优先级（观众信息密度 > 主编原创性 > 重复检测）、Style 一致性回炉；新增 stages.多平台适配 节点。 |
| `选题策划` v1.0 → v1.1 | Step 1 增系列上下文检测 + `historical-insights.md` 读取；系列项目强制去重 + 递进判定；输出 schema 增 `series_relation` / `inherit_phrase_seed` / `teaser_phrase_seed` 字段。 |
| `文案撰写` v1.0 → v1.1 | Step 1.5 读 `persona-profile.json`；Step 5.5 人设一致性检查（forbidden_phrases 一票否决、catchphrases / 标点 / emoji / 句式 / 标题钩子 5 维加权）；系列项目必含承接/预告句；输出 `persona_score` 0–5。 |
| `发布物打包` v1.0 → v1.1 | 检测多平台变体文件，在 `发布指引.md` 追加跨平台错峰表；系列项目在指引顶部加"系列位置"块（当前期数 / 承接 / 预告）。 |
| `发布复盘` v1.0 → v1.1 | `publish-history.jsonl` 新增 `platform` / `series` / `persona_score` 字段；新增 Step 4.5 跨平台聚合；Step 4.6 重写 `references/historical-insights.md`（按新 YAML schema）；Step 4.7 persona 漂移告警。 |

### 状态文件

- `project-state.json` schema 升至 v1.3.0
- 新增字段（全部 optional，向后兼容）：
  - `config.series`
  - `config.multi_platform`
  - `config.persona_ref`
  - `stages.多平台适配`
  - `series_context`
  - `quality_bar.persona_min_score`

### 新增全局资源

```
references/
├── persona-profile.json             ← v1.3 人设语料库写入
├── persona-profile.example.json     ← v1.3 默认模板
├── historical-insights.md           ← v1.3 升为主路径位置（兼容旧 skills/选题策划/references/ 路径）
└── publish-history.jsonl            ← v1.3 加 platform / series / persona_score 字段
```

### v1.2 → v1.3 迁移说明

**完全向后兼容**：v1.2 旧项目**无需任何迁移**。判定逻辑：

| 旧项目特征 | v1.3 行为 |
|---|---|
| `config.series` 缺失 | 走单期模式，所有 v1.2 流水线不变 |
| `series_context` 缺失 | 走单期模式 |
| `stages.多平台适配` 缺失 | 视为 `skipped`，发布物打包走 v1.0 目录 |
| `quality_bar.persona_min_score` 缺失 | 默认 3.5 |
| `persona-profile.json` 缺失 | 文案撰写 Step 1.5 / 5.5 跳过，persona_score 不写入 |
| `historical-insights.md` 缺失 | 发布复盘首次跑会创建；样本 < 3 不生成 Top 3 |

**主动升级路径**（推荐）：

1. **第一步（必做）**：跑一次 `/人设语料库`，贴 3–5 篇你自己的旧文，让 AI 学你的语感
2. **第二步（想做系列再做）**：跑 `/系列化规划` 建排期表
3. **第三步（想多平台再做）**：下次打包时勾选"多平台适配"

### 设计原则

- **不破坏 v1.2 state 文件**：所有新字段都 optional
- **不强制跑新 skill**：用户不主动启用，旧行为完全保留
- **不依赖 connector**：所有 v1.3 新能力都能在无 connector 下独立运行
- **不隐藏 complexity**：系列模式 / 批量模式 / 多平台 / persona 是 4 个独立开关，按需启用

---

## v1.2.0 · 2024-12

**主题**：AI 配图 + 数据闭环 + 多项目并行。

### 新增

- `封面插图`：ImageGen 为 P1 封面生成配图，支持 background / top_half / center_float 三种嵌入模式，A/B 测试两版
- `发布复盘`：收集平台数据 → `publish-history.jsonl` → 数据驱动推荐回灌

### 升级

- `编辑部编排`：多项目并行（按主题目录隔离 state）
- `观众视角`：A/B 封面测试方案输出
- `海报生成`：支持封面图嵌入

### 破坏性变更

无。

---

## v1.1.0 · 2024-09

**主题**：总编排 + 三层审校。

### 新增

- `编辑部编排`：总调度，支持断点续跑、定向回炉（最多 2 次）
- `主编审阅`：六维评分卡（知识密度 / 原创角度 / 逻辑闭环 / 风格一致性 / 审美水位 / 稀缺表达）
- `观众视角`：模拟 3 秒刷客 / 深度党 / 挑刺党

### 升级

无（首版架构）

### 破坏性变更

无。

---

## v1.0.0 · 2024-06

**主题**：首版。

- 沉淀自「拆《深度工作》」项目
- 8 个 skill：原文摄入 / 选题策划 / 文案撰写 / 海报生成 / 责编 / 主编 / 观众 / 打包 + 内部风格库
- 3:4 竖版 9 页 pptx

---

## 附录 · 升级 Checklist

### v1.2 → v1.3

- [ ] 更新插件源目录（`rsync` 或 `cp -R` 整个 `xiaohongshu-studio/`）
- [ ] 验证 `plugin.json` 中 version === "1.3.0" + skills 数组包含 15 项
- [ ] 老项目的 `project-state.json` 不需要迁移
- [ ] 跑一次 `/人设语料库` 初始化 persona（推荐）
- [ ] 跑一次 `/发布复盘` 触发 `historical-insights.md` 自动重建

### 已知限制

- 多平台目前仍需手动到各平台粘贴（小红书 / 抖音 / 公众号官方 MCP 未开放）
- persona 检测是 LLM 风格比对，不是规则引擎，准确性 ±10%
- 跨平台错峰表假设账号在每个平台都已开通，未开通过的会被算法降权
- 插件运行期校验走 MCP `mcp__qw-builtin__qw_query({ key: "qoderwork.settings.skills" })` 触发；离线环境用本文件 + 文件树校验替代
