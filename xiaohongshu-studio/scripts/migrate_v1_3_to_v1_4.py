"""
migrate_v1_3_to_v1_4.py · v1.4 M27 迁移脚本

把 v1.3.x 项目的 `config.series` 镜像字段移除（v1.4 起 `series_context` 是唯一字段）。

行为：copy 而非 delete — 保留 `config.series` 作为 fallback，避免在 v1.3.x 插件被
同时安装的环境下破坏回读逻辑。

用法：
  # Dry-run：仅打印 diff
  python3 scripts/migrate_v1_3_to_v1_4.py --dry-run

  # 真实运行：写 + 添加 marker 文件
  python3 scripts/migrate_v1_3_to_v1_4.py --apply

  # 单独迁移某个项目
  python3 scripts/migrate_v1_3_to_v1_4.py --apply projects/拆书-深度工作/project-state.json

  # 回滚
  python3 scripts/migrate_v1_3_to_v1_4.py --rollback projects/拆书-深度工作/

回滚机制：迁移时把 `config.series` 改名到 `config.series_legacy`（保留内容）。
回滚时把 `config.series_legacy` 复制回 `config.series` + 删除 `series_context`。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "projects"
MARKER_FILENAME = ".v1.4-migration-applied"


def find_project_states() -> list[Path]:
    return sorted(PROJECTS.glob("*/project-state.json"))


def migrate_state(path: Path, dry_run: bool = True) -> tuple[bool, str]:
    """迁移单个 project-state.json。返回 (changed, summary)。"""
    if path.is_dir():
        return False, f"  {relpath(path)}: 是目录，跳过"
    if not path.exists():
        return False, f"  {relpath(path)}: 不存在，跳过"
    text = path.read_text()
    data = json.loads(text)
    changes = []

    # v1.4 P1-1: 防 config: null 崩溃
    config = data.get("config") or {}
    series = config.get("series")
    series_context = data.get("series_context")

    if not series and not series_context:
        return False, f"  {relpath(path)}: 无 series 字段，跳过"

    if series and not series_context:
        # Case 1: 只有 v1.3 镜像，缺 canonical → 复制到 series_context
        sc = {
            "id": series["id"],
            "episode": series.get("episode", 1),
            "total_planned": series.get("total_planned", 1),
            "cadence": series.get("cadence", "weekly_tue"),
            "theme_one_liner": series.get("theme_one_liner", ""),
        }
        data["series_context"] = sc
        changes.append("  + 新增 series_context (从 config.series 复制)")
        changes.append(f"    {sc}")
        data.setdefault("config", {})
        data["config"]["series_legacy"] = data["config"].pop("series")
        changes.append("  ~ config.series → config.series_legacy (保留)")

    elif series and series_context:
        # Case 2: 两边都有 → 检查一致性 + 把 config.series 移到 legacy
        for k in ("id", "episode", "total_planned", "cadence", "theme_one_liner"):
            if k in series and series[k] != series_context.get(k):
                changes.append(
                    f"  ! {k} 不一致：legacy={series[k]!r} canonical={series_context.get(k)!r}"
                )
        data.setdefault("config", {})
        data["config"]["series_legacy"] = data["config"].pop("series")
        changes.append("  ~ config.series → config.series_legacy")

    else:
        return False, f"  {relpath(path)}: 已迁移（仅 series_context）"

    if not dry_run:
        # 写回
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        # 添加 marker 文件
        marker = path.parent / MARKER_FILENAME
        if not marker.exists():
            marker.write_text(f"v1.4 migration applied at {path.name}\n")

    return True, "\n".join(changes)


def relpath(p: Path) -> str:
    """safe relative_to — 失败时 fallback 到 str(p)"""
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


def rollback(path: Path) -> str:
    """回滚：config.series_legacy → config.series；删除 series_context。"""
    if path.is_dir():
        return f"  {relpath(path)}: 是目录，跳过"
    if not path.exists():
        return f"  {relpath(path)}: 不存在，跳过"
    text = path.read_text()
    data = json.loads(text)
    # v1.4 P1-1: 防 config: null 崩溃
    config = data.get("config") or {}
    series_legacy = config.get("series_legacy")
    if not series_legacy:
        return f"  {relpath(path)}: 无 series_legacy，无法回滚"
    data["config"]["series"] = data["config"].pop("series_legacy")
    if "series_context" in data:
        del data["series_context"]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    marker = path.parent / MARKER_FILENAME
    if marker.exists():
        marker.unlink()
    return f"  ✓ {relpath(path)}: 已回滚"


def main() -> int:
    parser = argparse.ArgumentParser(description="M27 v1.4 config.series 迁移脚本")
    parser.add_argument("--dry-run", action="store_true", default=True, help="默认 dry-run（仅打印 diff）")
    parser.add_argument("--apply", action="store_true", help="真实写回 + 添加 marker")
    parser.add_argument("--rollback", action="store_true", help="回滚模式")
    parser.add_argument("targets", nargs="*", help="指定 project-state.json 路径（默认全 projects/）")
    args = parser.parse_args()

    dry_run = not args.apply

    if args.rollback:
        print("=== 回滚模式 ===\n")
        targets = [Path(t) for t in args.targets] if args.targets else find_project_states()
        for t in targets:
            print(rollback(t))
        return 0

    print(f"=== {'Dry-run' if dry_run else 'APPLY'} 模式 ===\n")
    targets = [Path(t) for t in args.targets] if args.targets else find_project_states()
    if not targets:
        print(f"  (无 projects/*/project-state.json；扫描 {PROJECTS})")
        return 0

    total = 0
    changed = 0
    for t in targets:
        result, summary = migrate_state(t, dry_run=dry_run)
        print(summary)
        total += 1
        if result:
            changed += 1

    print()
    print(f"  扫描 {total} 个 state 文件，将变更 {changed} 个")
    if dry_run:
        print("  这是 dry-run — 加 --apply 才会真实写回")
    return 0


if __name__ == "__main__":
    sys.exit(main())
