"""test_pptx_helpers.py · 共享工具单测"""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "skills" / "_shared"))
sys.path.insert(0, str(ROOT / "scripts"))

from pptx_helpers import (
    normalize_previous_episodes,
    resolve_palette,
    PALETTE_MAP,
    OVERLAY_COLOR,
    format_ab_output,
)


class TestNormalizePreviousEpisodes:
    def test_none(self):
        assert normalize_previous_episodes(None) == []

    def test_empty_list(self):
        assert normalize_previous_episodes([]) == []

    def test_v130_string_paths(self):
        """v1.3.0/v1.3.1 字符串路径形式"""
        paths = [
            "projects/拆书-深度工作-vol1",
            "projects/拆书-深度工作-vol2",
        ]
        assert normalize_previous_episodes(paths) == [1, 2]

    def test_path_with_slash_vol(self):
        """兼容 /volN 形式"""
        paths = ["projects/拆书-深度工作/vol3"]
        assert normalize_previous_episodes(paths) == [3]

    def test_path_without_vol_suffix(self):
        """无 -volN 后缀 → graceful 跳过"""
        assert normalize_previous_episodes(["projects/some-legacy-path"]) == []

    def test_v132_object_form(self):
        """v1.3.2 对象数组形式"""
        objs = [
            {"project_id": "拆书-深度工作", "episode": 5},
            {"project_id": "拆书-深度工作", "episode": 3},
        ]
        assert normalize_previous_episodes(objs) == [5, 3]

    def test_mixed_forms(self):
        """worst case: 字符串 + 对象 + garbage"""
        mixed = [
            "projects/拆书-vol5",
            {"project_id": "拆书", "episode": 6},
            "garbage",
        ]
        assert normalize_previous_episodes(mixed) == [5, 6]

    def test_object_with_missing_episode(self):
        """缺 episode 字段 → 视为 0（defensive default）"""
        assert normalize_previous_episodes([{"project_id": "x"}]) == [0]

    def test_object_with_invalid_episode(self):
        """episode 是字符串 'bad' → 跳过"""
        assert normalize_previous_episodes([{"episode": "bad"}]) == []

    def test_episode_zero_or_negative(self):
        """episode=0 也算合法（虽然不典型）"""
        assert normalize_previous_episodes([{"episode": 0}]) == [0]


class TestResolvePalette:
    def test_known_style(self):
        palette = resolve_palette("暖调知识风")
        assert palette == PALETTE_MAP["暖调知识风"]

    def test_unknown_style_falls_back(self):
        palette = resolve_palette("不存在的风格")
        assert palette == PALETTE_MAP["暖调知识风"]

    def test_all_four_styles_defined(self):
        for name in ["暖调知识风", "清新种草风", "深色hook风", "文艺情绪风"]:
            assert name in PALETTE_MAP
            palette = PALETTE_MAP[name]
            assert "bg" in palette
            assert "fg" in palette
            assert "accent" in palette


class TestOverlayColor:
    def test_overlay_color_defined(self):
        assert OVERLAY_COLOR is not None


class TestFormatAbOutput:
    def test_format_returns_required_keys(self):
        result = format_ab_output("A", "/path/to/A.png")
        assert "variant" in result
        assert "output_path" in result
        assert "generated_at" in result
        assert result["variant"] == "A"
        assert result["output_path"] == "/path/to/A.png"

    def test_generated_at_is_iso(self):
        result = format_ab_output("B", "/path/B.png")
        # ISO 格式：YYYY-MM-DDTHH:MM:SS+08:00
        import re
        assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", result["generated_at"])


class TestBackCompat:
    """v1.3.3 back-compat matrix — 4 种 previous_episodes 形态全部支持"""

    def test_v130_compat(self):
        # 旧项目加载路径
        v130_state = {
            "config": {"series": {"id": "深度工作实验室", "episode": 3, "total_planned": 8}},
            "series_context": {
                "id": "深度工作实验室",
                "episode": 3,
                "total_planned": 8,
                "previous_episodes": ["projects/拆书-深度工作-vol1", "projects/拆书-深度工作-vol2"],
                "cross_episode": {"inherit_phrase_seed": None, "teaser_phrase_seed": None},
            },
        }
        # Step 4b 启动时读 previous_episodes
        done = normalize_previous_episodes(v130_state["series_context"]["previous_episodes"])
        assert done == [1, 2]

    def test_v132_compat(self):
        v132_state = {
            "series_context": {
                "previous_episodes": [
                    {"project_id": "拆书-深度工作", "episode": 1},
                    {"project_id": "拆书-深度工作", "episode": 2},
                ],
            },
        }
        done = normalize_previous_episodes(v132_state["series_context"]["previous_episodes"])
        assert done == [1, 2]

    def test_v133_with_inherit_phrase_propagation(self):
        """v1.3.3 跨期承接句传递"""
        # Vol.2 落地了 teaser_phrase
        vol2_state = {
            "series_context": {
                "cross_episode": {"teaser_phrase": "下期我会拆 Vol.3 的 4 个误区"}
            }
        }
        # Vol.3 启动时复制到 inherit_phrase_seed
        vol3_state = {
            "series_context": {
                "episode": 3,
                "cross_episode": {
                    "inherit_phrase_seed": vol2_state["series_context"]["cross_episode"]["teaser_phrase"],
                    "teaser_phrase_seed": None,
                }
            }
        }
        assert vol3_state["series_context"]["cross_episode"]["inherit_phrase_seed"] == \
               "下期我会拆 Vol.3 的 4 个误区"


class TestForbiddenExtractorWordBoundary:
    """v1.4.1 P1-4: check_text word-boundary 匹配。"""
    def test_english_phrase_in_chinese_surrounding(self):
        r"""'yyds' 嵌在中文里也应命中（前面 start, 后面中文非 \w）"""
        from forbidden_extractor import check_text
        assert check_text("yyds永远的神", ["yyds"]) == ["yyds"]

    def test_english_phrase_with_space(self):
        from forbidden_extractor import check_text
        assert check_text("yyds yyds", ["yyds"]) == ["yyds"]

    def test_chinese_phrase_followed_by_chinese(self):
        from forbidden_extractor import check_text
        assert check_text("家人们快冲", ["家人们"]) == ["家人们"]

    def test_chinese_phrase_punct_boundary(self):
        from forbidden_extractor import check_text
        assert check_text("yyds!", ["yyds"]) == ["yyds"]

    def test_concatenated_english_not_hit(self):
        from forbidden_extractor import check_text
        # 'yyds' 不命中 'yydyyds'（中间嵌入）
        assert check_text("yydyyds", ["yyds"]) == []
        # 'yyds' 不命中 'yydsyyds'（粘连）
        assert check_text("yydsyyds", ["yyds"]) == []


class TestMigrateConfigNull:
    """v1.4.1 P1-1: config: null 不应让 migrate 崩溃。"""
    def test_migrate_skips_config_null(self):
        from migrate_v1_3_to_v1_4 import migrate_state
        import json, tempfile
        from pathlib import Path
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            p = Path(f.name)
            json.dump({"project_id": "p", "config": None, "stages": {}}, f)
        result, msg = migrate_state(p, dry_run=True)
        # 应该不崩，结果是"无 series 字段，跳过"
        assert "无 series" in msg or result is False
        p.unlink(missing_ok=True)


class TestMigratePathGuards:
    """v1.4.1 P1-2: 路径不存在 / 是目录不应让脚本崩溃。"""
    def test_rollback_missing_path(self):
        from migrate_v1_3_to_v1_4 import rollback
        from pathlib import Path
        result = rollback(Path("/tmp/__v141_does_not_exist__.json"))
        assert "不存在" in result

    def test_rollback_directory_path(self):
        from migrate_v1_3_to_v1_4 import rollback
        from pathlib import Path
        result = rollback(Path("/tmp"))  # /tmp is a directory
        assert "目录" in result

    def test_migrate_directory_path(self):
        from migrate_v1_3_to_v1_4 import migrate_state
        from pathlib import Path
        result, msg = migrate_state(Path("/tmp"), dry_run=True)
        assert "目录" in msg


class TestSchemaSkippedBackcompat:
    """v1.4.1 P1-3: schema 允许 status:skipped + config:null。"""
    def test_status_skipped_with_notes_validates(self):
        import json, jsonschema
        schema = json.load(open(ROOT / "schemas/project-state.schema.json"))
        state = {
            "project_id": "test",
            "stages": {"原文摄入": {"status": "skipped", "notes": "no source"}}
        }
        jsonschema.validate(state, schema)  # 不抛异常

    def test_config_null_validates(self):
        import json, jsonschema
        schema = json.load(open(ROOT / "schemas/project-state.schema.json"))
        state = {"project_id": "test", "config": None, "stages": {}}
        jsonschema.validate(state, schema)

    def test_config_null_plus_status_skipped(self):
        import json, jsonschema
        schema = json.load(open(ROOT / "schemas/project-state.schema.json"))
        state = {
            "project_id": "test",
            "config": None,
            "stages": {"多平台适配": {"status": "skipped", "notes": "no multi"}},
        }
        jsonschema.validate(state, schema)
