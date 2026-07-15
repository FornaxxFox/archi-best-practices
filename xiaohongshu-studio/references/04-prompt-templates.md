# 封面插图 Prompt 模板库

## 按内容类型 × 调色板的 Prompt 组合

### 拆书 × warm_knowledge
```
A minimalist conceptual illustration of [书中核心意象], soft warm lighting with muted earth tones, 
cozy reading atmosphere, subtle paper texture background, clean composition with open space in 
the bottom third for text overlay, no text no letters no numbers in the image, 
editorial illustration style, simple shapes, warm amber and cream palette
```

### 拆书 × dark_hook
```
A dramatic conceptual visualization of [书中核心意象], moody cinematic lighting, 
deep navy blue background with bold orange accent elements, high contrast, 
minimalist composition with clear space at bottom for text, 
no text no letters no numbers, abstract geometric style, mysterious atmosphere
```

### 教程 × warm_knowledge
```
A top-down flat lay of [教程相关工具/场景], organized neatly on a warm wooden surface,
soft natural window light from the left, muted earth tone palette, 
clean minimal objects, generous negative space at bottom third,
no text no letters no numbers, editorial photography style
```

### 教程 × fresh_lifestyle
```
A bright clean workspace showing [教程相关元素], natural daylight, 
white and pastel color scheme, airy composition with white space,
minimal objects placed with intention, bottom area clear for text overlay,
no text no letters no numbers, lifestyle editorial aesthetic
```

### 种草 × fresh_lifestyle
```
A soft-lit product scene featuring [产品类目的通用意象], 
bright pastel tones, clean white background with subtle shadows,
dreamy bokeh, product centered in upper portion of frame,
bottom third reserved for text, no text no letters no numbers,
fresh natural aesthetic, editorial product photography style
```

### 情绪 × literary_mood
```
A dreamy atmospheric scene of [情绪意象], watercolor texture overlay,
vintage muted color palette with sage green and warm brown,
soft focus, poetic and contemplative mood, silhouette or abstract forms,
generous space in lower portion for text, no text no letters no numbers,
artistic illustration with painterly quality
```

### 反常识 × dark_hook
```
A striking visual metaphor for [反常识概念], dramatic split composition,
one side conventional one side unexpected, deep contrast lighting,
bold color accent against dark background, slightly surreal,
bottom area with dark gradient for text readability,
no text no letters no numbers, conceptual art style
```

## Prompt 工程规则

### 必须包含的元素
1. 画面主体描述（具体且可视化）
2. 光线描述（方向 + 质感）
3. 色调约束（与调色板一致）
4. 构图留白指令（为文字预留空间）
5. 排除指令（no text no letters no numbers）

### 风格关键词库

**质感词**：
- 高级感：editorial, minimalist, refined, curated
- 温暖感：cozy, intimate, soft, gentle
- 冲击感：dramatic, bold, striking, cinematic
- 文艺感：poetic, dreamy, artistic, painterly

**光线词**：
- soft natural light, golden hour warmth
- dramatic side lighting, cinematic contrast
- flat even lighting, bright and airy
- moody low-key lighting, subtle rim light

**构图词**：
- clean composition with negative space
- centered subject with breathing room
- rule of thirds placement
- top-heavy composition with clear bottom

### 禁用词（会导致质量下降）
- "beautiful"（太泛）
- "perfect"（无信息量）
- "realistic photo"（与排版风格冲突）
- "4K, 8K, ultra HD"（对生成模型无效）
- "masterpiece, best quality"（噪声词）

## 尺寸选择决策树

```
封面用法？
├─ 全屏背景 → 1024x1536（竖版，更贴合 3:4）
├─ 上半图 → 1024x768（横向裁切上半部分）
└─ 居中浮动 → 1024x1024（正方形，居中放置）
```

## A/B 测试变体策略

当需要生成 2 张对比封面时：

| 变体维度 | A 版 | B 版 |
|---|---|---|
| placement | background | top_half |
| 色调倾向 | 暖色 | 冷色 |
| 主体 | 抽象概念 | 具象物件 |
| 构图 | 居中对称 | 三分偏移 |

选择 1 个维度做变体，其余保持一致，确保可归因。
