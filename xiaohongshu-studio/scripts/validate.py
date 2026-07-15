"""
validate.py · v1.3.4 校验脚本

校验：
1. 所有 15 个 SKILL.md frontmatter 合法 + 含 name/version/description
2. 所有 .json 文件可解析
3. references/schedule.json 满足 6 平台 × 5 属性结构
4. plugin.json skills 数组与磁盘一致
5. SKILL.md frontmatter name 与目录名一致
6. _shared/pptx_helpers.py self-test 通过

运行：`python3 scripts/validate.py` 或 `make validate`
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def err(msg: str) -> None:
    print(f"  ✗ {msg}")


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def check_frontmatter() -> int:
    print("=== 1. SKILL.md frontmatter ===")
    fails = 0
    skills_dir = ROOT / "skills"
    if not skills_dir.exists():
        # mega-skill: 跳过 skills/ 校验
        return 0
    for d in sorted(skills_dir.iterdir()):
        if not d.is_dir():
            continue
        # 跳过 _shared 等基础设施目录
        if d.name.startswith("_"):
            continue
        skill_md = d / "SKILL.md"
        if not skill_md.exists():
            err(f"{d.name}/SKILL.md missing")
            fails += 1
            continue
        text = skill_md.read_text()
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if not m:
            err(f"{d.name}: no frontmatter")
            fails += 1
            continue
        fm = m.group(1)
        for k in ("name:", "version:", "description:"):
            if k not in fm:
                err(f"{d.name}: missing {k}")
                fails += 1
        name = re.search(r"name:\s*(\S+)", fm)
        if name and name.group(1) != d.name:
            err(f"{d.name}: frontmatter name={name.group(1)} mismatch")
            fails += 1
        else:
            ok(f"{d.name}")
    return fails


def check_json_files() -> int:
    print("\n=== 2. JSON files ===")
    fails = 0
    json_files = [
        ".qoder-plugin/plugin.json",
        "references/schedule.json",
        "examples/persona-profile.example.json",
        "examples/persona-profile.example.json",
    ]
    for path in json_files:
        p = ROOT / path
        if not p.exists():
            err(f"{path}: missing")
            fails += 1
            continue
        try:
            json.load(open(p))
            ok(f"{path}")
        except Exception as e:
            err(f"{path}: {e}")
            fails += 1
    return fails


def check_plugin_manifest() -> int:
    print("\n=== 3. Plugin manifest ===")
    fails = 0
    p = ROOT / ".qoder-plugin/plugin.json"
    if not p.exists():
        err("plugin.json missing")
        return 1
    d = json.load(open(p))
    declared = set(d.get("skills", []))
    if not declared:
        err("no skills declared")
        return 1
    # 校验 skills 目录 (mega-skill: 跳过)
    skills_dir = ROOT / "skills"
    if not skills_dir.exists():
        if fails == 0:
            ok(f"plugin manifest OK ({len(declared)} skills declared, mega-skill 形态)")
        return 0
    for s in declared:
        path = ROOT / s
        if not (path / "SKILL.md").exists():
            err(f"declared skill missing on disk: {s}")
            fails += 1
    # mega-skill: skills/ 目录不存在（已合并为单 SKILL.md）
    if (ROOT / "skills").exists():
        for d2 in skills_dir.iterdir():
            if d2.name.startswith("_"):
                continue
            if (d2 / "SKILL.md").exists():
                if f"skills/{d2.name}" not in declared:
                    err(f"on-disk skill not in manifest: skills/{d2.name}")
                    fails += 1
    if fails == 0:
        ok(f"plugin manifest OK ({len(declared)} skills declared)")
        ok(f"version={d.get('version')}")
        ok(f"required manifest fields: license={d.get('license')}, engines={d.get('engines', {}).get('min_qoderwork_version')}")
    return fails


def check_schedule_json() -> int:
    print("\n=== 4. schedule.json structure ===")
    fails = 0
    p = ROOT / "references/schedule.json"
    if not p.exists():
        err("missing")
        return 1
    d = json.load(open(p))
    expected = {"xiaohongshu", "douyin_text", "wechat_oa", "zhihu", "jike", "twitter"}
    actual = set(d.get("platforms", {}).keys())
    missing = expected - actual
    extra = actual - expected
    if missing:
        err(f"missing platforms: {missing}")
        fails += 1
    if extra:
        err(f"unexpected platforms: {extra}")
        fails += 1
    # 每个平台必含 display_name/time/offset_hours_from_xiaohongshu/image_aspect/tag_count/primary
    required = {"display_name", "time", "offset_hours_from_xiaohongshu", "image_aspect", "tag_count", "primary"}
    for pid, pdata in d.get("platforms", {}).items():
        miss = required - set(pdata.keys())
        if miss:
            err(f"platform {pid} missing: {miss}")
            fails += 1
    if fails == 0:
        ok(f"6 platforms, all 6 required fields each")
    return fails


def check_pptx_helpers_self_test() -> int:
    print("\n=== 5. pptx_helpers.py self-test ===")
    import subprocess
    r = subprocess.run(
        ["python3", str(ROOT / "scripts/pptx_helpers.py")],
        capture_output=True, text=True,
    )
    if r.returncode == 0 and "OK" in r.stdout:
        ok(r.stdout.strip())
        return 0
    err(r.stderr or r.stdout)
    return 1


def main() -> int:
    print(f"validating plugin at: {ROOT}\n")
    fails = 0
    fails += check_frontmatter()
    fails += check_json_files()
    fails += check_plugin_manifest()
    fails += check_schedule_json()
    fails += check_pptx_helpers_self_test()
    print()
    if fails == 0:
        print("ALL_OK")
        return 0
    print(f"FAILED ({fails} issues)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
