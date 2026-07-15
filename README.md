# archi-best-practices

> Showcase of architectural / engineering best practices, implemented as working artifacts.
> Each project in this repo is a real, runnable example — not slides or docs.

## Projects

### [xiaohongshu-studio/](./xiaohongshu-studio/) · v1.4.1

**Self-media editorial toolkit** for producing Xiaohongshu (RedNote) style poster carousels.

- **What**: From a book/URL/article → ready-to-publish 9-page PPT + 6-platform variants + persona consistency check
- **Why it matters**: Demonstrates:
  - **5-pass self-review process** (contract → review → optimize → ship) catching 70+ defects
  - **Single-source-of-truth state schema** with jsonschema machine-validated
  - **Shared canonical utilities** (调色板 / forbidden_phrases / 错峰时间) so multiple files don't drift
  - **Full pytest + 3-tier validation pipeline** (manifest / skill outputs / schema)
  - **M-series migration scripts** for back-compat (config.series → series_context)
  - **100% back-compat** with v1.2 / v1.3.x state files

- **Stats**:
  - 50 source files (15-skill plugin compressed to mega-skill 1-file entry)
  - 1 SKILL.md unified entry + 21 numbered references/ + 5 jsonschema + 7 Python tools
  - 40 pytest cases (all pass) + 3 validation scripts (all ALL_OK)
  - License: MIT

- **Install**:
  ```bash
  git clone https://github.com/FornaxxFox/archi-best-practices.git
  cd archi-best-practices/xiaohongshu-studio
  make install      # python-pptx + jsonschema + pytest
  make test         # 40 pytest
  make validate     # manifest / JSON / schedule / pptx self-test
  ```

## Principles applied across projects

1. **Contract-first design** — single source of truth for field names / enums / thresholds
2. **5-pass self-review** before any release (4 reviews against the artifact, 1 review of the previous version's review)
3. **Back-compat by default** — old state files must keep working; explicit migration scripts for breaking changes
4. **Shared utilities are hard rules** — palette / 错峰时间 / persona forbidden list, not "best-effort"
5. **Tests catch back-compat** — every v1.3 → v1.4 → v1.5 transition gets regression test
6. **Versioning is a contract** — `schema_version: 1.3.2` in state files; v1.3.x → v1.4.x → v1.4.1 documented in UPGRADE.md

## License

MIT © 2026 FornaxxFox
