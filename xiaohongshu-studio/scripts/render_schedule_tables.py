"""
render_schedule_tables.py · v1.3.4 schedule 表自动生成器

从 references/schedule.json 重新生成 3 个 markdown 表：
1. skills/多平台适配/references/cross-post-schedule.md 中的默认错峰时间表
2. skills/系列化规划/references/scheduling-patterns.md 中的黄金时段 + 避坑时段
3. skills/发布物打包/SKILL.md 中的"六、跨平台发布排期"6 行模板

每个文件加 "auto-generated, do not edit" 顶部 banner 提醒用户。

运行：`python3 scripts/render_schedule_tables.py` 或 `make render`
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEDULE = ROOT / "references" / "schedule.json"


def load_schedule() -> dict:
    return json.load(open(SCHEDULE))


def render_main_table() -> str:
    """生成默认错峰时间表（6 行）"""
    s = load_schedule()
    lines = [
        "| 顺序 | 平台 | 与小红书发布间隔 | 时间 |",
        "|---|---|---|---|",
    ]
    for idx, (pid, pdata) in enumerate(s["platforms"].items(), 1):
        offset = pdata["offset_hours_from_xiaohongshu"]
        offset_str = "0（同步）" if offset == 0 else f"+{offset}h"
        lines.append(f"| {idx} | {pdata['display_name']} | {offset_str} | {pdata['time']} |")
    return "\n".join(lines) + "\n"


def render_golden_slots() -> str:
    """生成黄金时段表"""
    s = load_schedule()
    lines = [
        "| 内容类型 | 黄金时段 |",
        "|---|---|",
    ]
    for cat, slots in s["golden_slots"].items():
        lines.append(f"| {cat} | {', '.join(slots)} |")
    return "\n".join(lines) + "\n"


def render_avoid_slots() -> str:
    """v1.4 起渲染为 markdown 列表。"""
    s = load_schedule()
    return "\n".join(f"- {slot}" for slot in s["avoid_slots"]) + "\n"


def render_packaging_template() -> str:
    """生成 发布物打包 6 行模板"""
    s = load_schedule()
    primary = s["platforms"]["xiaohongshu"]
    lines = [
        f"| 平台 | 发布时间 | 配图 | 标签数 | 文件 | 状态 |",
        f"|---|---|---|---|---|---|",
        f"| 小红书 | {primary['time']} | 9 页 PPT 导 PNG | {primary['tag_count']} | `{{素材}}-发布文案.md` | ✅ 主线 |",
    ]
    for pid in ["douyin_text", "wechat_oa", "zhihu", "jike", "twitter"]:
        p = s["platforms"][pid]
        display = p["display_name"]
        file_ext = {
            "douyin_text": "{素材}-抖音图文版.md",
            "wechat_oa": "{素材}-公众号版.md",
            "zhihu": "{素材}-知乎版.md",
            "jike": "{素材}-即刻版.md",
            "twitter": "{素材}-Twitter版.md",
        }[pid]
        lines.append(f"| {display} | {p['time']} | 单图 | {p['tag_count']} | `{file_ext}` | 已生成 / 未启用 |")
    return "\n".join(lines) + "\n"


def patch_file(path: Path, marker: str, new_block: str) -> None:
    """在 marker 标记处插入/替换 new_block"""
    text = path.read_text()
    # 找 marker 之后到下一个空行或下一个 ## 之前的范围
    pattern = re.compile(
        rf"(<!-- AUTO-GENERATED-{marker} START -->)(.*?)(<!-- AUTO-GENERATED-{marker} END -->)",
        re.S,
    )
    if pattern.search(text):
        text = pattern.sub(lambda m: m.group(1) + "\n" + new_block + m.group(3), text)
    else:
        # 第一次跑：插入 marker + block
        text += f"\n\n<!-- AUTO-GENERATED-{marker} START -->\n{new_block}<!-- AUTO-GENERATED-{marker} END -->\n"
    path.write_text(text)
    print(f"  ✓ patched {path.relative_to(ROOT)}")


def main() -> int:
    print("rendering schedule tables from references/schedule.json\n")

    # 1. cross-post-schedule.md 的默认错峰表 + 避坑时段
    cross = ROOT / "skills/多平台适配/references/cross-post-schedule.md"
    if cross.exists():
        patch_file(cross, "MAIN", render_main_table())
        # 在 main 表后追加 AVOID 段
        text = cross.read_text()
        avoid_block = (
            "<!-- AUTO-GENERATED-AVOID START -->\n"
            + render_avoid_slots()
            + "<!-- AUTO-GENERATED-AVOID END -->"
        )
        if "<!-- AUTO-GENERATED-AVOID START -->" in text:
            text = re.sub(
                r"<!-- AUTO-GENERATED-AVOID START -->.*?<!-- AUTO-GENERATED-AVOID END -->",
                avoid_block, text, flags=re.S,
            )
        else:
            # 在 MAIN END 后插入
            text = re.sub(
                r"(<!-- AUTO-GENERATED-MAIN END -->\n)",
                r"\1\n" + avoid_block + "\n",
                text, count=1,
            )
        cross.write_text(text)
        print(f"  ✓ patched {cross.relative_to(ROOT)} (AVOID section)")

    # 2. scheduling-patterns.md 的黄金时段
    sched = ROOT / "skills/系列化规划/references/scheduling-patterns.md"
    if sched.exists():
        # 黄金时段在文中"## 黄金发布时间"段后插入
        text = sched.read_text()
        new_block = (
            "<!-- AUTO-GENERATED-GOLDEN START -->\n"
            + render_golden_table()
            + "<!-- AUTO-GENERATED-GOLDEN END -->"
        )
        # 简单 replace 逻辑：把"## 黄金发布时间（小红书 2025–2026 数据经验值）"下方的列表替换
        if "<!-- AUTO-GENERATED-GOLDEN START -->" in text:
            text = re.sub(
                r"<!-- AUTO-GENERATED-GOLDEN START -->.*?<!-- AUTO-GENERATED-GOLDEN END -->",
                new_block,
                text,
                flags=re.S,
            )
        else:
            # 找到"## 黄金发布时间"标题，在标题后追加
            text = re.sub(
                r"(## 黄金发布时间[^\n]*\n)",
                r"\1\n" + new_block + "\n",
                text,
                count=1,
            )
        sched.write_text(text)
        print(f"  ✓ patched {sched.relative_to(ROOT)}")

    # 3. 发布物打包 SKILL.md 的 6 行模板
    pack = ROOT / "skills/发布物打包/SKILL.md"
    if pack.exists():
        text = pack.read_text()
        new_block = "<!-- AUTO-GENERATED-PACKAGING START -->\n" + render_packaging_template() + "<!-- AUTO-GENERATED-PACKAGING END -->"
        # 替换已存在的 marker
        if "<!-- AUTO-GENERATED-PACKAGING START -->" in text:
            text = re.sub(
                r"<!-- AUTO-GENERATED-PACKAGING START -->.*?<!-- AUTO-GENERATED-PACKAGING END -->",
                new_block,
                text,
                flags=re.S,
            )
        else:
            # 第一次跑：在 ## 六、 段后追加
            text = re.sub(
                r"(## 六、跨平台发布排期[^\n]*\n)",
                r"\1\n" + new_block + "\n",
                text,
                count=1,
            )
        pack.write_text(text)
        print(f"  ✓ patched {pack.relative_to(ROOT)}")

    print("\nOK · all schedule tables regenerated from references/schedule.json")
    print("    future schedule.json edits: run `make render`")
    return 0


def render_golden_table() -> str:
    return render_golden_slots()


if __name__ == "__main__":
    sys.exit(main())
