# Persona 提取模板

## 提取流程（5 步）

### Step 1：通读语料

读 3–5 篇代表作（或 5 句口述），通读不分析，先建立"语感印象"。

### Step 2：标记 3 类信号

在语料中标记：

| 信号 | 标记 | 示例 |
|---|---|---|
| 重复出现 | `***` | "说白了" 出现 5 次 |
| 反常出现 | `!!!` | 全篇不用 emoji，唯独用 1 个 ⚡ |
| 强烈风格 | `>>> ` | "看似 X，实则 Y" 结构 |

### Step 3：8 维度逐条提取

按 persona-profile.json 的 8 个维度逐条填写。

### Step 4：列"绝对不说的话"

读 3 遍，专门找"用户看到会皱眉"的话。常见清单：

- ❌ "家人们"（过度亲密）
- ❌ "绝绝子"（网络黑话）
- ❌ "yyds"（饭圈用语）
- ❌ "宝子" / "集美"（过度女性化）
- ❌ "小仙女"（刻板印象）
- ❌ "家人们快冲"（小红书硬广语）
- ❌ "不容错过"（营销号语）
- ❌ "惊呆了"（夸大宣传）

（不同 persona 不同禁忌，按用户实际偏好过滤）

### Step 5：找金句模板

提取"用户表达观点时的高频结构"：

- "不是 A，是 B"（反转式）
- "看似 X，实则 Y"（打脸式）
- "X 的本质是 Y"（定义式）
- "X 不是 Y 的问题，是 Z 的问题"（归因式）
- "如果你也 X，那么 Y"（共鸣式）

## 自检问题（提取后问自己）

1. **我能让一个朋友读完 persona-profile 就模仿出这个作者吗？** → 通过
2. **profile 里有"作者可能说的话"和"作者绝对不会说的话"两类吗？** → 必须都有
3. **catchphrases 是不是真的高频？** → 至少 2 篇出现才算
4. **forbidden_phrases 是不是真的禁忌？** → 用户明确说过 OR 风格明显冲突
5. **signature_templates 是不是可复用的表达结构？** → 至少 2 个

## Persona 演进规则

| 触发条件 | 动作 |
|---|---|
| persona_score ≥ 4.0 连续 5 期 | profile 锁定，不更新 |
| persona_score 3.0–4.0 持续 | 微调（增 / 删 catchphrases） |
| persona_score < 3.0 持续 3 期 | 重建 profile |
| 用户主动说"我想换人设" | 全量重建 |
| 用户说"忘了我的风格" | 重新跑提取流程 |

## 与历史数据联动

发布复盘输出 `persona_score` 后，做"风格 → 数据"相关性分析：

```
找出 persona_score 最高的前 3 期：
- 这 3 期的 catchphrases 交集是？
- 这 3 期的 emoji 密度是？
- 这 3 期的 forbidden_phrases 命中率是？

→ 把这些"高 persona_score 特征"加权到 persona-profile
```

## Persona 模板（Markdown 速查）

```markdown
# Persona · {owner}

## 1 句话总结
{voice_summary}

## 口头禅（top 5）
- {catchphrase 1}
- {catchphrase 2}
- ...

## 句式偏好
- 平均句长：{short / medium / long}
- 偏好结构：{list of signature_templates}

## 标点使用
- 感叹号：{rare / moderate / frequent}
- 问号：{...}
- 省略号：{...}
- 破折号：{...}
- 波浪号：{never / rare / moderate}

## emoji 密度
{none / low / medium / high}

## 标题钩子
{top 3 hook types}

## 段落长度
{1_line / short / medium / long}

## 绝对不说的话
- {forbidden 1}
- {forbidden 2}
- ...

## 金句模板
- {template 1}
- {template 2}
- ...

## 3 句代表性金句
> {sample quote 1}
> {sample quote 2}
> {sample quote 3}
```
