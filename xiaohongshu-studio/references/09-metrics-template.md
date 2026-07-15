# 复盘数据模板

> **v1.3.2 同步声明**：本文件的 JSONL row 字段表与 `state-schema.md` § publish-history.jsonl row contract 同步；出现冲突时以 state-schema 为准。

## 必填指标

用户至少提供以下数据之一组合：

### 最小数据集（3 项）
- 阅读量（或曝光量）
- 点赞数
- 收藏数

### 标准数据集（6 项）
- 曝光量
- 阅读量
- 点赞数
- 收藏数
- 评论数
- 分享数

### 完整数据集（10 项）
- 曝光量
- 阅读量（= 点击量）
- 点赞数
- 收藏数
- 评论数
- 分享数
- 关注转化数
- 笔记互动率
- 搜索来源占比
- 推荐来源占比

## 计算公式

```
CTR（点击率）= 阅读量 / 曝光量
互动率 = (点赞 + 收藏 + 评论 + 分享) / 阅读量
收藏/点赞比 = 收藏数 / 点赞数
涨粉率 = 关注转化数 / 阅读量
```

## 引导话术

当用户数据不完整时，按优先级引导补充：

1. "曝光量和阅读量分别是多少？"（算 CTR）
2. "收藏数是多少？"（算收藏/赞比 = 内容深度信号）
3. "评论数呢？有没有高赞评论？"（互动质量信号）
4. "这篇大概涨了几个粉？"（IP 黏性信号）

## 基准线参考表

### 按内容类型（topic_band · 4-way）

| topic_band | CTR | 完读率 | 收藏/赞 | 互动率 |
|---|---|---|---|---|
| 拆书笔记 | 6-10% | 25%+ | >0.4 | 4-6% |
| 干货教程 | 7-12% | 20%+ | >0.5 | 5-8% |
| 种草测评 | 5-8% | 20%+ | >0.25 | 3-5% |
| 情绪故事 | 4-7% | 30%+ | >0.15 | 3-5% |
| 反常识观点 | 8-15% | 15%+ | >0.2 | 5-10% |

> topic_band（4-way）用于 CTR 指导；topic_type（6-way enum）用于 JSONL `topic_type` 字段。两者不可互换。

### 按粉丝量级修正系数

| 粉丝量 | 修正系数 | 说明 |
|---|---|---|
| <500 | ×0.5 | 极冷启动，关注趋势不看绝对值 |
| 500-1000 | ×0.7 | 冷启动期 |
| 1000-5000 | ×0.9 | 成长期 |
| 5000-10000 | ×1.0 | 标准基准 |
| 10000-50000 | ×1.1 | 中腰部 |
| >50000 | ×1.3 | 头部要求更高 |

## JSONL row contract（v1.3.2）

与 `state-schema.md` § publish-history.jsonl row contract 一致。完整定义以 state-schema 为准；本表为 quick-reference：

```jsonc
{
  "date": "ISO 日期",                                              // 必填
  "platform": "xiaohongshu|douyin_text|wechat_oa|zhihu|jike|twitter", // 必填（v1.3.0 复合值 jike_twitter 已废弃）
  "title": "笔记标题",                                                // 必填
  "topic_band": "拆书|教程|种草|情绪",                                 // 4-way · 可选
  "topic_type": "拆书|教程|种草|情绪|清单|反常识",                      // 6-way enum · 必填
  "viral_structure": "痛点解决|反常识|干货清单|情绪共鸣",                 // 必填
  "palette": "warm_knowledge|fresh_lifestyle|dark_hook|literary_mood", // 必填
  "cover_has_image": true,                                          // v1.2 起 · 是否使用 ImageGen 封面
  "series": {                                                       // v1.3 · 系列项目必填
    "id": "深度工作实验室",
    "episode": 3
  },
  "persona_score": 4.2,                                            // v1.3 · null 表示无 persona
  "metrics": {
    "impressions": 0,
    "reads": 0,
    "ctr": 0.0,
    "likes": 0,
    "saves": 0,
    "comments": 0,
    "shares": 0,
    "interaction_rate": 0.0,                                       // (likes+saves+comments+shares) / reads
    "save_like_ratio": 0.0,                                        // saves / likes
    "completion_rate": 0.0
  },
  "verdict": "above_baseline|at_baseline|below_baseline",            // 必填
  "winning_factors": [],
  "losing_factors": [],
  "next_action": "下一期具体调整建议",
  "cross_platform_ref": {                                            // v1.3.2 · 多平台项目互引
    "douyin_text": "{date}#{project_id}#{episode}#douyin_text",
    "wechat_oa": "{date}#{project_id}#{episode}#wechat_oa"
  }
}
```

**v1.3.2 字段变更（vs v1.2）**：
- ➕ 新增：`platform` / `topic_band` / `series` / `persona_score` / `cross_platform_ref`
- ❌ 删除：`follows`（v1.2 死字段，从未实际写入）
- 📝 改名：原 v1.2 `topic_type` 4-way 改名为 `topic_band`；新增 v1.3 `topic_type` 6-way enum

> 不一致时 state-schema.md 胜出。

