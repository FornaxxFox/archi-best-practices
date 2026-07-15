"""test_schedule_json.py · 6 平台 schedule 校验"""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SCHEDULE = ROOT / "references" / "schedule.json"


@pytest.fixture
def schedule():
    return json.load(open(SCHEDULE))


def test_6_platforms_present(schedule):
    assert set(schedule["platforms"].keys()) == {
        "xiaohongshu", "douyin_text", "wechat_oa", "zhihu", "jike", "twitter"
    }


def test_xiaohongshu_is_primary(schedule):
    assert schedule["platforms"]["xiaohongshu"]["primary"] is True
    assert schedule["platforms"]["douyin_text"]["primary"] is False


def test_offsets_make_sense(schedule):
    """xhs = 0, douyin = 24h, wechat = 48h, zhihu = 72h, jike/twitter = 0"""
    assert schedule["platforms"]["xiaohongshu"]["offset_hours_from_xiaohongshu"] == 0
    assert schedule["platforms"]["douyin_text"]["offset_hours_from_xiaohongshu"] == 24
    assert schedule["platforms"]["wechat_oa"]["offset_hours_from_xiaohongshu"] == 48
    assert schedule["platforms"]["zhihu"]["offset_hours_from_xiaohongshu"] == 72
    assert schedule["platforms"]["jike"]["offset_hours_from_xiaohongshu"] == 0
    assert schedule["platforms"]["twitter"]["offset_hours_from_xiaohongshu"] == 0


def test_no_jike_twitter_compound(schedule):
    """v1.3.0 复合值 jike_twitter 必须已不存在"""
    assert "jike_twitter" not in schedule["platforms"]
    assert "jike_twitter" not in str(schedule["platforms"])


def test_golden_slots_present(schedule):
    assert "拆书/干货" in schedule["golden_slots"]
    assert "种草/测评" in schedule["golden_slots"]
    assert "情绪/故事" in schedule["golden_slots"]


def test_avoid_slots_present(schedule):
    assert len(schedule["avoid_slots"]) >= 1


def test_series_cadence_options(schedule):
    expected = {"weekly_tue", "weekly_sun", "biweekly_tue_thu", "daily", "alt_day"}
    assert expected.issubset(set(schedule["series_cadence"].keys()))


def test_every_platform_has_required_fields(schedule):
    required = {"display_name", "time", "offset_hours_from_xiaohongshu", "image_aspect", "tag_count", "primary"}
    for pid, pdata in schedule["platforms"].items():
        assert required.issubset(set(pdata.keys())), f"{pid} missing fields"


def test_schema_version_stamped(schedule):
    assert schedule.get("schema_version", "").startswith("1.3")
