# 小红书图文工厂 · Mega-Skill v1.4.1

> **15-skill plugin 的单文件合并版**。从 77 文件压到 51 个源文件（↓ 34%）。
> 同源 v1.4.1：所有契约、阈值、schema 与 15-skill plugin 完全一致。

## 与 15-skill plugin 对比

| 维度 | 15-skill plugin | mega-skill（本目录）|
|---|---|---|
| 文件数 | 77 | 51 (↓ 34%) |
| SKILL.md 入口 | 15 个分散 | 1 个统一 |
| 单独 stage 调用 | ✓ `/文案撰写` 等 | ✗ 需读 SKILL.md 内部引用 |
| prompt token 起步 | 按调用按需 | 大（首调 ~15K tokens）|
| 适用场景 | 日常迭代、高频单 stage | 一次性端到端、集成、对外分发 |

**选 15-skill**（`xiaohongshu-studio/`）：plugin loader 自动发现，每个 stage 可独立调
**选 mega-skill**（本目录 `xiaohongshu-studio-mega/`）：单 SKILL.md 入口，端到端跑

## 文件结构

```
SKILL.md                        ← 主入口（v1.4.1 mega-skill）
README.md / UPGRADE.md / CHANGELOG.md / CONNECTORS.md

references/  (24 个)             ← 21 reference 文档（按编号 00-09）
├── INDEX.md                    ← 编号目录
├── 00-state-schema.md
├── 01-historical-insights.md
├── 01-persona-template.md
├── 02-topic-template.md
├── 02-viral-patterns.md
├── 03-{body-structures,hashtag-strategy,title-formulas}.md
├── 04-{9-page-layouts,prompt-templates}.md
├── 05-{six-dimension-rubric,three-reader-scripts}.md
├── 06-{compliance-checklist,risk-checklist,viral-checklist}.md
├── 07-{cross-post-schedule,platform-specs,tone-mapping}.md
├── 08-{scheduling-patterns,series-structures}.md
├── 09-metrics-template.md
├── schedule.json
└── forbidden_defaults.json

schemas/    (5 个)              ← 机器可校验
├── project-state.schema.json
├── persona-profile.schema.json
├── series-state.schema.json
├── publish-history-row.schema.json
└── schedule.schema.json

scripts/    (7 个)              ← Python 工具
├── pptx_helpers.py            ← 调色板 + 封面嵌入 + 兼容 normalizer
├── forbidden_extractor.py      ← 3 源合并 + word-boundary 匹配
├── state_io.md                 ← prose canonical（路径/状态机/阈值）
├── validate.py                 ← 5 项 manifest 校验
├── validate_skill_outputs.py   ← 5 项 skill output 校验
├── render_schedule_tables.py   ← schedule.json → 3 个 markdown 表
└── migrate_v1_3_to_v1_4.py     ← M27 迁移（dry-run/apply/rollback）

examples/   (4 个)              ← fixture
├── series-bible.example.md
├── multi-platform-outputs.example.md
├── persona-profile.example.json
└── quickstart.md

tests/      (3 个 + 40 pytest)   ← pytest discoverable
├── test_pptx_helpers.py        (28 tests)
├── test_schedule_json.py       (12 tests)
└── conftest.py

Makefile                        ← test / validate / render / migrate targets
.qoder-plugin/plugin.json       ← 1.4.1
```

## 快速开始

### 安装到 ClaudeCode plugin dir

```bash
rsync -av . ~/.qoderwork/plugins-custom/xiaohongshu-studio/
```

或保留两份（15-skill + mega-skill）：

```bash
# 1. 装 15-skill
rsync -av ../xiaohongshu-studio/ ~/.qoderwork/plugins-custom/xiaohongshu-studio/

# 2. 装 mega-skill（替换/共存，看你）
rsync -av . ~/.qoderwork/plugins-custom/xiaohongshu-studio-mega/
```

### 验证

```bash
cd ~/.qoderwork/plugins-custom/xiaohongshu-studio-mega
make test              # 40 pytest
make validate          # 5 项 manifest 校验
make validate-skills   # 5 项 skill output 校验
```

### 触发 skill

开新 ClaudeCode session：

```
帮我拆《深度工作》做小红书图文
```

**注**：mega-skill 是单 SKILL.md，不像 15-skill 那样有 `/文案撰写` `/选题策划` 等独立 slash command。LLM 看到 `argument-hint` 提示后会按 SKILL.md 编排跑全流程。

## 9-Stage 流水线（v1.4.1）

1. 原文摄入 → 结构化拆解卡
2. 选题策划 → 3-5 候选角度
3. 文案撰写 → 5 标题 + 长/短版正文 + 标签
4. 海报生成 → 9 页 PPT
5. 封面插图 → AI 配图（海报内部）
6. 责编审校 → 合规 + 爆款 + 风险
7. 主编审阅 → 6 维评分
8. 观众视角 → 3 读者模拟
9. 发布物打包 → outputs/ + 6 平台错峰表

3 独立 skill：系列化规划 / 多平台适配 / 人设语料库
2 共享 utility：pptx_helpers / forbidden_extractor

详见 [SKILL.md](SKILL.md) § 9-Stage 流水线。

## 工具链

```bash
make install              # python-pptx + jsonschema + pytest
make test                 # 40 pytest
make validate             # 5 项 (frontmatter / JSON / manifest / schedule / pptx self-test)
make validate-skills      # 5 项 (md refs / shared import / 字段 / schema / JSON parse)
make render               # 重新生成 3 个 schedule 表
make migrate-episode-ids  # M27 迁移 (config.series → series_context)
make migrate-dry-run      # 迁移 dry-run
```

## 与 15-skill plugin 共存

两份都装的话：

- `~/.qoderwork/plugins-custom/xiaohongshu-studio/` ← 15-skill 形态
- `~/.qoderwork/plugins-custom/xiaohongshu-studio-mega/` ← mega-skill 形态

ClaudeCode plugin loader 会扫两个目录，按 manifest 的 `name` 字段识别。它们都叫 `xiaohongshu-studio`，**会有冲突**。建议：

- 装一份就够
- 或：装 mega-skill 到 `xiaohongshu-studio/`，15-skill 留作源码参考

## 迁移 15-skill 项目到 mega-skill

state 文件无需迁移（同一 v1.4.1 schema）：

```bash
# 旧 v1.3.x 项目用 M27 脚本
make migrate-episode-ids
# v1.2 / v1.4.1 项目无需迁移
```

## 版本

- **v1.4.1**（当前）· 6th self-review 收口：4 P1 + 3 P2 修复
- 完全向后兼容 v1.2 / v1.3.x（[UPGRADE.md](UPGRADE.md) 详细路径）
- 40 pytest + 5 项 manifest 校验 + 5 项 skill output 校验全过

详见 [CHANGELOG.md](CHANGELOG.md)。
