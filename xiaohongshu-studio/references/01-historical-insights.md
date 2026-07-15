# 历史数据洞察 · schema 参考

> ⚠️ **v1.3.2 重要变更**：本文件是 **schema 参考文档**，**不是 live 数据**。
>
> - **live 数据**：`references/historical-insights.md`（workspace 根，由「发布复盘」Step 4.6 写入）
> - **本文件**：仅作为 schema 定义 + 示例输出样本，**v1.3.2 起只读**，发布复盘不再写回
>
> 选题策划 / 系列化规划 读取 live 数据时，必须读 workspace 根路径，**不要**读本文件。
> 本文件里硬编码的 Top 1 / Top 2 / Top 3 数字是示例，**不**代表任何用户的真实基线。

---

## § Schema

```yaml
# 顶层字段（v1.3.2 live 格式）
generated_at: ISO 8601
sample_size: N 期
schema_version: 1.3.2
top_performers: list[TopPerformer]
anti_patterns: list[AntiPattern]
audience_signals: AudienceSignals
recent_trend: list[RecentEntry]
```

### TopPerformer

```yaml
- structure: 反常识            # viral_structure
  palette: dark_hook
  hook_type: 自我打脸式         # title_hook_types
  metrics:
    ctr: 0.0..1.0
    interaction_rate: 0.0..1.0
    save_like_ratio: 0.0..1.0
  repr_episode_id: "{project_id}#vol-N"  # 引用 publish-history.jsonl
  reuse_features: [...]         # 可复用特征（短句）
```

### AntiPattern

```yaml
- condition: "viral_structure=X AND palette=Y"   # 连续 2+ 期低于基准的组合
  observed_in: 2..N
  bad_metrics: ...
  recommendation: "避免此组合"
```

### AudienceSignals

```yaml
save_likers: { common_features: [...] }   # save_like_ratio > 0.4
commenters: { common_features: [...] }   # comments > mean*2
follow_growers: { common_features: [...] }  # follow_rate > 0.8%
```

### RecentEntry

```yaml
- date: ISO
  title: string
  ctr: 0.0
  interaction_rate: 0.0
  save_like_ratio: 0.0
  verdict: "above_baseline | at_baseline | below_baseline"
```

---

## § Example output（NOT live data — 仅作示例参考）

> ⚠️ 以下是**示例输出样本**，由本文件保留仅供 LLM 学习输出格式。**不**代表任何用户的真实基线。**不要**在生产读取时引用这些数字。

```markdown
---
generated_at: 2026-07-14T10:00:00+08:00
sample_size: 12
schema_version: 1.3.2
---

# 历史数据洞察（自动生成，勿手动编辑）

## 表现最佳的内容特征（top 3）

### Top 1
- **结构类型**：反常识
- **调色板**：dark_hook
- **标题钩子**：自我打脸式（"我以为 X，其实 Y"）
- **核心指标**：CTR 12.3% / 互动率 8.1% / save_like_ratio 0.52
- **代表期**：拆书-深度工作 Vol.3
- **可复用特征**：反差数字 + 自嘲开头 + 1 个具体数据

### Top 2
- **结构类型**：痛点解决
- **调色板**：warm_knowledge
- **标题钩子**：痛点提问式
- **核心指标**：CTR 10.1% / 互动率 6.5% / save_like_ratio 0.45
- **代表期**：拆书-原子习惯 Vol.2
- **可复用特征**：分类清单 + 行动指引 + 共鸣场景

### Top 3
- **结构类型**：干货清单
- **调色板**：fresh_lifestyle
- **标题钩子**：数字承诺式
- **核心指标**：CTR 9.5% / 互动率 5.2% / save_like_ratio 0.61
- **代表期**：测评-降噪耳机 Vol.1
- **可复用特征**：5 条清单 + 1 个对比表 + 决策建议

## 应避免的模式（连续 2 期低于基准的组合）

- ❌ **情绪共鸣型 + 文艺色调** → 连续 2 期互动率 < 3%（基准 3%）
- ❌ **9 页全干货**（无行动清单）→ 完读率从 25% 跌到 12%
- ❌ **封面无 ImageGen** → CTR 比有图低 30–40%

## 受众偏好信号

### 收藏型内容（save_like_ratio > 0.4 共性）
- 含可执行行动清单
- 含可截图保存的图表 / 公式
- 含可复用的清单 / 框架

### 讨论型内容（comments > 均值 2x 共性）
- 包含"自问自答"型钩
- 结尾留争议性观点
- 标签中含争议性话题（如 #反常识）

### 涨粉型内容（follow_rate > 0.8% 共性）
- 系列感强（"深度工作 Vol.3"）
- 母题一致
- 文末预告"下期"

## 最近 5 期趋势

| 期 | 标题 | CTR | 互动率 | 收藏/赞 | 完读率 | 判定 |
|---|---|---|---|---|---|---|
| 拆书-深度工作 Vol.3 | 我以为深度工作 = 远离手机 | 12.3% | 8.1% | 0.52 | 32% | ⭐⭐⭐⭐⭐ |
| 拆书-深度工作 Vol.2 | 4 小时 = 12 小时 | 9.8% | 5.5% | 0.38 | 24% | ⭐⭐⭐⭐ |
| 拆书-深度工作 Vol.1 | 深度工作不是时间管理 | 8.2% | 5.1% | 0.41 | 22% | ⭐⭐⭐⭐ |
| 拆书-原子习惯 Vol.2 | 习惯的本质是身份 | 10.1% | 6.5% | 0.45 | 28% | ⭐⭐⭐⭐⭐ |
| 拆书-原子习惯 Vol.1 | 30 天读完 12 本书 | 6.5% | 4.0% | 0.32 | 18% | ⭐⭐⭐ |
```

---

## 维护规则（v1.3.2）

1. **写入方**：「发布复盘」Step 4.6 在每期发布后追加 + 整理
   - 写入目标：`references/historical-insights.md`（workspace 根）
   - **不**写本文件
2. **读取方**：「选题策划」Step 1（系列项目）+「系列化规划」Step 6（涨粉预估）
   - 读源：workspace 根 `references/historical-insights.md`
   - **不**读本文件（除非要学习 schema 格式）
3. **本文件**（schema 参考）：**v1.3.2 起只读**，不会被覆盖
4. **样本 < 3 期**（live 数据）：不生成 Top 3 / 模式，只追加"最近 N 期"

## 与系列化规划的协同

| 字段 | 来源 | 用法 |
|---|---|---|
| `top_performers.title_hook_types` | 发布复盘（live 数据） | 选题策划优选这些钩子 |
| `anti_patterns` | 发布复盘 | 选题策划强制避开 |
| `audience_signals` | 发布复盘 | 系列化规划在排期时参考 |
| `recent_trend[].verdict` | 发布复盘 | 系列化规划判断节奏是否需要调整 |
