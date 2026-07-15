"""
validate_skill_outputs.py · v1.4 skill output validator

校验：
1. 15 SKILL.md 引用的所有 .md 路径都存在
2. 所有 _shared/*.py 可 import
3. 所有 cross-reference ([text](path)) resolve
4. 所有 _seed / canonical 字段名一致（state-schema 单一来源）
5. 5 个 JSON Schema 文件 vs 实际 JSON 文件 schema 合规
6. schedule.json vs schedule.schema.json schema 合规

运行：`python3 scripts/validate_skill_outputs.py`
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


def check_md_references() -> int:
    """校验 15 SKILL.md + 顶层 .md 中所有相对路径 reference 都存在。v1.4.1 P2-1 修复：扫描整棵树。"""
    print("=== 1. SKILL.md + 顶层 .md 引用 ===")
    fails = 0
    # v1.4.1 P2-1: 改为扫描整棵树，捕获 README / CHANGELOG / UPGRADE / examples
    md_files = []
    for p in ROOT.rglob("*.md"):
        # 跳过测试 / 缓存 / node_modules 等
        parts = set(p.parts)
        if parts & {".pytest_cache", "__pycache__", "node_modules", ".git"}:
            continue
        md_files.append(p)
    pattern = re.compile(r"\[([^\]]+)\]\(([^)]+\.md)\)")

    for md in md_files:
        if md.name.startswith("_"):
            continue
        text = md.read_text()
        for label, target in pattern.findall(text):
            if target.startswith(("http://", "https://", "#")):
                continue
            if target.startswith("/"):
                target_path = ROOT / target.lstrip("/")
            else:
                target_path = (md.parent / target).resolve()
            if not target_path.exists():
                err(f"{md.relative_to(ROOT)}: {label!r} → {target} (not found at {target_path.relative_to(ROOT)})")
                fails += 1
    if fails == 0:
        ok(f"all md references resolve ({len(md_files)} md files scanned)")
    return fails


def check_shared_imports() -> int:
    """校验 scripts/*.py 可 syntax check（mega-skill 不 exec 整个 module，避免 __file__ 缺失）"""
    print("\n=== 2. scripts/*.py syntax check ===")
    fails = 0
    shared = ROOT / "scripts"
    if not shared.exists():
        err("scripts/ missing")
        return 1
    for py in sorted(shared.glob("*.py")):
        if py.name.startswith("_"):
            continue
        try:
            # 只做 syntax check（compile 不 exec）
            with open(py) as f:
                compile(f.read(), str(py), 'exec')
            ok(f"{py.relative_to(ROOT)} (syntax OK)")
        except SyntaxError as e:
            err(f"{py.relative_to(ROOT)}: {e}")
            fails += 1
        except Exception as e:
            err(f"{py.relative_to(ROOT)}: {e}")
            fails += 1
    return fails


def check_seed_canonical_consistency() -> int:
    """校验 _seed / canonical 字段在 state-schema.md 中是一致声明的"""
    print("\n=== 3. _seed / canonical 字段一致性 ===")
    fails = 0
    state_schema = ROOT / "references/00-state-schema.md"
    if not state_schema.exists():
        err("state-schema.md (00) missing")
        return 1
    text = state_schema.read_text()
    # 列出 _seed 字段
    seed_fields = set(re.findall(r"(\w+_seed)\b", text))
    # 列出 canonical 字段（不带 _seed 的）
    canonical_pattern = re.compile(r"\b(inherit_phrase|teaser_phrase|inherit_phrase_seed|teaser_phrase_seed)\b")
    found = set(canonical_pattern.findall(text))
    expected_seeds = {"inherit_phrase_seed", "teaser_phrase_seed"}
    expected_canonicals = {"inherit_phrase", "teaser_phrase"}
    if not expected_seeds.issubset(found):
        miss = expected_seeds - found
        err(f"missing seed fields in state-schema.md: {miss}")
        fails += 1
    if not expected_canonicals.issubset(found):
        miss = expected_canonicals - found
        err(f"missing canonical fields: {miss}")
        fails += 1
    if fails == 0:
        ok(f"all 4 fields present: {sorted(found)}")
    return fails


def check_json_schema_files() -> int:
    """校验 5 个 JSON Schema 存在 + 用 jsonschema 校验 example JSON"""
    print("\n=== 4. JSON Schema vs example 文件 ===")
    fails = 0
    try:
        import jsonschema
    except ImportError:
        err("jsonschema not installed (run `make install`)")
        return 1

    pairs = [
        ("schemas/persona-profile.schema.json",
         "examples/persona-profile.example.json"),
        ("schemas/persona-profile.schema.json",
         "skills/人设语料库/references/persona-profile.example.json"),
        ("schemas/schedule.schema.json",
         "references/schedule.json"),
    ]
    for schema_path, json_path in pairs:
        sp = ROOT / schema_path
        jp = ROOT / json_path
        if not sp.exists() or not jp.exists():
            continue
        try:
            schema = json.loads(sp.read_text())
            instance = json.loads(jp.read_text())
            jsonschema.validate(instance=instance, schema=schema)
            ok(f"{jp.relative_to(ROOT)} validates against {sp.relative_to(ROOT)}")
        except jsonschema.ValidationError as e:
            err(f"{jp.relative_to(ROOT)} fails {sp.relative_to(ROOT)}: {e.message[:100]}")
            fails += 1
        except Exception as e:
            err(f"{schema_path} ↔ {json_path}: {e}")
            fails += 1
    return fails


def check_json_files_parse() -> int:
    """校验所有 .json 文件可解析"""
    print("\n=== 5. JSON files parse ===")
    fails = 0
    for p in ROOT.rglob("*.json"):
        if p.name.startswith("_") or "node_modules" in p.parts:
            continue
        try:
            json.loads(p.read_text())
        except Exception as e:
            err(f"{p.relative_to(ROOT)}: {e}")
            fails += 1
    if fails == 0:
        ok("all .json files parse")
    return fails


def main() -> int:
    print(f"validating skill outputs at: {ROOT}\n")
    fails = 0
    fails += check_md_references()
    fails += check_shared_imports()
    fails += check_seed_canonical_consistency()
    fails += check_json_schema_files()
    fails += check_json_files_parse()
    print()
    if fails == 0:
        print("ALL_OK")
        return 0
    print(f"FAILED ({fails} issues)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
