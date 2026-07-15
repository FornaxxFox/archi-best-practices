---
name: archlens-case-production
description: Build a traceable architectural precedent research pack from public source material.
---

# ArchLens case production

This workflow produces a case that can be displayed by ArchLens and exposed through MCP.

## Required input

- Project name, architect/studio, location, year, typology, and scale when available.
- At least one public source URL and a note about the source license.
- Original material links or files; do not present generated images as project documentation.

## Pipeline

1. Collect and record sources before interpretation.
2. Normalize project metadata and deduplicate links.
3. Extract the design principle, spatial strategy, elements, palette, tags, and risks.
4. Separate source-grounded statements from editorial interpretation.
5. Review every claim and keep the original URL next to the claim.
6. Run the source intake audit to capture page metadata and a bounded excerpt.
7. Export `case.json`, `README.md`, and a research Markdown file.
8. Run schema and source checks before publishing.

## Executable handoff

把本模板复制为自己的 `case.json` 并替换所有占位内容，然后运行：

```bash
npm run case:pack -- --input ./case.json --out ./research-packs/<case-id>
```

先用来源 intake 记录原始页面证据：

```bash
npm run source:audit -- --input ./case.json --out ./research-packs/<case-id>/sources
```

这个步骤只使用 Node.js 标准库，按顺序读取 HTTPS 页面，记录状态、标题、描述、canonical 和有上限的短摘录；它不会下载图片、保存整页内容或自动生成事实。随后 `case:pack` 会校验必填字段、HTTPS 来源、图像许可、数组字段和 HEX 颜色，并输出 `case.json`、`research-pack.md`、`README.md` 三件套。来源采集和编辑判断仍由贡献者负责。

审核来源后，把报告带进资料包：

```bash
npm run case:pack -- --input ./case.json --out ./research-packs/<case-id> --source-report ./research-packs/<case-id>/sources/source-report.json
```

带上 `--source-report` 时，资料包会额外包含 `source-report.json`，并在 Markdown/README 中标明它是来源复核证据，不是自动生成的事实。

批量处理多个 `case.json` 时使用：

```bash
npm run source:pipeline -- --input ./cases --out ./research-packs/source-intake
```

Pipeline 按顺序处理目录中的 JSON，给每个案例写入 `source-report.json` 和 `source-notes.md`，并写入总的 `pipeline-report.json`。任何 schema 错误、重复 ID 或来源失败都会保留报告并以非零状态结束，不能静默进入发布环节。

## Output schema

The case must include `id`, `title`, `architect`, `location`, `year`, `typology`, `projectType`, `principle`, `strategy`, `elements`, `palette`, `sources`, `risks`, and `tags`.

## Quality bar

- No unsourced project facts.
- No copyrighted image is redistributed without a compatible license.
- AI-generated interpretation is labelled and never substituted for original material.
- Every downloadable pack carries attribution and source links.
