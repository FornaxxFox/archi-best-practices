# UPGRADE.md · 小红书图文工厂升级指南

> 从 v1.x 升到 v1.3.4 的完整路径。如需更详细的字段迁移，参见 [CHANGELOG.md § 字段迁移地图](CHANGELOG.md)。

## TL;DR

**v1.3.x 任意旧版 → v1.3.4**：覆盖安装插件源目录 → 跑 `make test` → 完工。无 state 迁移。

**v1.2 → v1.3.4**：覆盖安装 → 跑一次 `/人设语料库`（可选）→ 跑一次 `/发布复盘` 触发 `references/historical-insights.md` 创建 → 完工。

**v1.0 / v1.1 → v1.3.4**：覆盖安装 → 跑一次 `/人设语料库` → 完工。

---

## 升级步骤（通用）

### 1. 备份（可选但推荐）

```bash
# 如果你已有 projects/ 目录，备份
cp -R ~/.qoderwork/plugins-custom/xiaohongshu-studio/projects/ /tmp/xhs-backup/
```

### 2. 安装新版本

```bash
# 拉新源码到工作目录，覆盖旧版
rsync -av --delete \
  /path/to/new/xiaohongshu-studio/ \
  ~/.qoderwork/plugins-custom/xiaohongshu-studio/
```

或者按你常用的更新方式（cp -R + rm -rf 旧版、git pull 等等）。

### 3. 验证安装

```bash
cd ~/.qoderwork/plugins-custom/xiaohongshu-studio
make test           # 跑 pytest 单测
make validate       # 跑 frontmatter + JSON + schedule 校验
```

预期输出：
```
tests/test_pptx_helpers.py::test_normalize_previous_episodes_v130 PASSED
tests/test_pptx_helpers.py::test_normalize_previous_episodes_v132 PASSED
tests/test_pptx_helpers.py::test_resolve_palette_fallback PASSED
tests/test_schedule_json.py::test_6_platforms PASSED
tests/test_schedule_json.py::test_golden_slots PASSED
validate: 15 skills OK / 4 JSON OK / 1 schedule.json OK
```

### 4. （可选）触发数据回灌

```bash
# 第一次跑 `/发布复盘` 会创建 references/historical-insights.md
# 之前的所有发布数据已经写过 publish-history.jsonl 的会被新格式读取
```

### 5. 完工

打开 QoderWork，跑 `/编辑部编排` 应该正常工作。

---

## 来自 v1.0 / v1.1 / v1.2

这些旧版没有 v1.3.x 的所有 v3 字段（persona / series / multi_platform / etc.）。升级后：

- **v1.0 / v1.1 / v1.2 state 文件**：会被识别为 `config.series = null` → 走单期模式 + `persona-profile.json 缺失` → 跳过 persona check + `stages.多平台适配 缺失` → 视为 `done`。**无需迁移**。
- **v1.0 / v1.1 / v1.2 发布复盘数据**：旧 `publish-history.jsonl` 行**不**含 `platform` / `series` / `persona_score` 字段。`/发布复盘` v1.3.3+ 会按 back-compat 规则读，缺失字段视为 null/缺省值。**无需迁移**。
- **建议**：跑一次 `/人设语料库` 建 persona + 跑一次 `/发布复盘` 触发 `references/historical-insights.md` 创建。

## 来自 v1.3.0

- `stages.文案撰写.iterations` (int) → v1.3.3 起视为 `{main: int, persona: 0, seeded: 0}` 自动展开 ✓
- `stages.封面插图.ab_variant` (string) → v1.3.3 起视为 enum 兼容读 ✓
- `series_context.previous_episodes` 字符串路径 → v1.3.3 运行时 normalize ✓
- `stages.多平台适配.platforms` 含 `"jike_twitter"` → v1.3.3 自动展开为 `["jike", "twitter"]` ✓
- **无需迁移**。

## 来自 v1.3.1

- 同 v1.3.0 + `rework_history.rework_stage` 值会被 v1.3.3 enum 化时校验，**非 enum 值会回退为字符串原值**（向后兼容）
- **无需迁移**。

## 来自 v1.3.2

- 与 v1.3.3 字段格式几乎完全一致；v1.3.2 写过的 `references/historical-insights.md`（workspace 根，v1.3.2 起为 canonical）继续可用
- v1.3.2 的 persona-profile.json **缺 `drift_alert` 字段** → v1.3.3 视为 null（默认无告警），首次 `/发布复盘` 后会写入
- **无需迁移**。

## 来自 v1.3.3

- **无需迁移**。直接覆盖安装。

---

## 故障排查

### 启动时看到 "persona 漂移告警"

正常。v1.3.3 新行为：`/发布复盘` 在连续 3 期 `persona_score < 3.5` 时写 `drift_alert`，`/编辑部编排` 启动时 surface。处理选项：
- 跑 `/人设语料库` 重建 persona
- 放宽 `forbidden_phrases`
- 选 `i` 忽略

### 海报生成 P9 显示 "下一期 Vol.N+1 即将发布" 占位

正常。`cross_episode.teaser_phrase` 字段未落地时降级。完成本期 `/发布复盘` 后，落地句会写回 state，下一期编排器启动时会自动复制到 `inherit_phrase_seed`。

### 错峰表 6 行有 "未启用" 标

正常。`/发布物打包` v1.3.1+ 在 6 行模板中显式标未启用的平台。如果你没启用 `/多平台适配`，则 5 行是 "未启用"。

### v1.3.0 项目的 `previous_episodes` 字符串路径

`pptx_helpers.normalize_previous_episodes()` 在 v1.3.3+ 自动 normalize。无需手动改 state。

### `state.schema_version` 字段还是 "1.3.0" / "1.3.1" / "1.3.2"

可以保留，无需升级到 "1.3.3"。v1.3.3 的所有 back-compat 规则按字段缺失/类型不匹配处理，不依赖 `schema_version` 字符串。**自动迁移**在 v1.4 计划中（M27 + schema_version upgrade）。

---

## 升级时常见错误

| 错误 | 原因 | 解决 |
|---|---|---|
| `ModuleNotFoundError: No module named 'pptx'` | python-pptx 未装 | `python3 -m pip install --user python-pptx` |
| `JSONDecodeError` 在 `publish-history.jsonl` | 旧行格式非 JSON | 跳过该行；v1.3.3+ 容忍非 JSON 行（不 crash） |
| 海报生成崩溃 `TypeError: string indices must be integers` | v1.3.0/1.3.1 旧 `previous_episodes` 字符串路径 | v1.3.3 已修；如仍出现，升级到 v1.3.3+ |
| 错峰表显示空 | `references/schedule.json` 缺失 | 重新 `rsync` 覆盖安装 |

---

## 版本升级后推荐的烟测

```bash
# 1. 跑单测
cd ~/.qoderwork/plugins-custom/xiaohongshu-studio
make test

# 2. 跑 manifest 校验
make validate

# 3. 跑一次示例流程（如果有 projects/ 旧 state）
# 对插件说："复盘上期"
# 应自动写 references/historical-insights.md（如有数据）
# 跑完后 cat ~/.qoderwork/plugins-custom/xiaohongshu-studio/references/historical-insights.md 看看
```

---

## v1.4+ 升级路径预告

- v1.4 计划：废弃 `config.series` 镜像（保留 `series_context` 单写）+ 完成剩余 L32–L36 清理 + 引入 `python3 -m xhs validate state` CLI
- v1.4 之前所有 v1.3.x 项目可平滑升级，无需用户操作
