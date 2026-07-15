"""
forbidden_extractor.py · v1.4 起 forbidden_phrases 加速工具

合并 3 个来源：
1. references/forbidden_defaults.json (curated 7 类 ~50 词)
2. 用户语料 (corpus_texts) 中高频出现的小红书 / 饭圈 / AI 味词
3. 用户 persona-profile.json#dimensions.forbidden_phrases (显式指定)

返回 (effective_forbidden, source_breakdown)

注意：本模块依赖 `re` 和 `collections`，无第三方依赖。

用法（LLM 流程）：
    from forbidden_extractor import extract_forbidden_phrases

    with open("references/forbidden_defaults.json") as f:
        defaults = json.load(f)

    corpus = [open(f).read() for f in corpus_files]

    persona = json.load(open("references/persona-profile.json"))

    effective, breakdown = extract_forbidden_phrases(
        defaults, corpus, persona
    )
    # effective: list[str]  最终禁用词集合
    # breakdown: dict  各来源词数
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Iterable

DEFAULT_MIN_FREQ = 3  # 语料中出现 ≥3 次才视为 "高频"
DEFAULT_MIN_LEN = 2  # 候选词长度 ≥2 字符
DEFAULT_MAX_PHRASES = 30  # 从语料自动提取的上限


def _load_defaults(defaults_path: Path) -> list[str]:
    """从 curated JSON 拉所有类别下的词"""
    if not defaults_path.exists():
        return []
    data = json.loads(defaults_path.read_text())
    all_phrases = []
    for cat, phrases in data.get("categories", {}).items():
        all_phrases.extend(phrases)
    return list(dict.fromkeys(all_phrases))  # dedupe 保序


def _extract_from_corpus(
    corpus_texts: Iterable[str],
    known_forbidden: set[str],
    min_freq: int = DEFAULT_MIN_FREQ,
    min_len: int = DEFAULT_MIN_LEN,
    max_phrases: int = DEFAULT_MAX_PHRASES,
) -> list[str]:
    """从语料中找高频词（已知禁用词以外的）"""
    counter: Counter = Counter()
    # 中文字符 + 2-6 字符的"短语"
    word_re = re.compile(r"[一-鿿]{" + str(min_len) + r",6}")
    for text in corpus_texts:
        for phrase in word_re.findall(text):
            if phrase in known_forbidden:
                continue
            counter[phrase] += 1
    # 过滤：freq ≥ min_freq 的 top max_phrases
    return [
        p for p, c in counter.most_common(max_phrases * 2)
        if c >= min_freq
    ][:max_phrases]


def extract_forbidden_phrases(
    defaults: dict | list[str],
    corpus_texts: Iterable[str] | None = None,
    persona: dict | None = None,
    min_freq: int = DEFAULT_MIN_FREQ,
    max_corpus_phrases: int = DEFAULT_MAX_PHRASES,
) -> tuple[list[str], dict]:
    """
    Args:
        defaults: curated defaults，可以是 dict (含 categories) 或 list[str] (直接词表)
        corpus_texts: 用户 3-5 篇代表作品的文本列表
        persona: persona-profile.json 解析后的 dict
        min_freq: 语料词频阈值
        max_corpus_phrases: 从语料自动提取的最大词数

    Returns:
        (effective_forbidden, source_breakdown)
        - effective_forbidden: 去重后的最终禁用词列表
        - source_breakdown: {"defaults": N, "corpus": N, "user": N}
    """
    # 1. defaults
    if isinstance(defaults, dict):
        curated = []
        for cat, phrases in defaults.get("categories", {}).items():
            curated.extend(phrases)
        curated = list(dict.fromkeys(curated))
    else:
        curated = list(defaults)

    # 2. corpus auto-extract
    corpus_phrases: list[str] = []
    if corpus_texts:
        corpus_phrases = _extract_from_corpus(
            corpus_texts, known_forbidden=set(curated),
            min_freq=min_freq, max_phrases=max_corpus_phrases,
        )

    # 3. user explicit
    user_phrases: list[str] = []
    if persona:
        user_phrases = persona.get("dimensions", {}).get("forbidden_phrases", [])
        # 移除与 curated 重叠的（保留用户的）
        # 但不去重 corpus 里的 — corpus 是发现信号
        user_phrases = [p for p in user_phrases if p not in curated]

    # 合并：curated ∪ corpus ∪ user，保留首次出现顺序
    seen: set[str] = set()
    effective: list[str] = []
    for p in curated + corpus_phrases + user_phrases:
        if p not in seen:
            seen.add(p)
            effective.append(p)

    breakdown = {
        "defaults": len(curated),
        "corpus": len(corpus_phrases),
        "user": len(user_phrases),
        "total": len(effective),
    }
    return effective, breakdown


def check_text(text: str, forbidden: list[str]) -> list[str]:
    r"""v1.4.1 P1-4: word-boundary 匹配。
    - 英文/数字：'\w'（ASCII 模式 = [a-zA-Z0-9_]）
    - 中文短语：'人' 不是 \w，phrase 两侧是中文/标点时也算边界
    - 例：'yyds' 不命中 'yyds永远的神' 中"yyds"前面是 start ✓ 后面是 '永'(非 \w)✓ → 命中
    - 例：'yyds' 在 'yyds yyds' 中 → 前面 \s + 后面 \s → 都 ✓ 命中
    """
    hits = []
    for phrase in forbidden:
        try:
            # re.ASCII 让 \w 只匹配 ASCII word chars (a-zA-Z0-9_)
            pat = re.compile(
                r"(?<!\w)" + re.escape(phrase) + r"(?!\w)",
                re.ASCII,
            )
            if pat.search(text):
                hits.append(phrase)
        except re.error:
            if phrase in text:
                hits.append(phrase)
    return hits


# === self-test ===

if __name__ == "__main__":
    import tempfile

    # Mock defaults
    defaults = {
        "categories": {
            "网络黑话": ["yyds", "绝绝子"],
            "小红书硬广": ["家人们", "集美"],
        }
    }

    # Mock corpus
    corpus = [
        "我今天 yyds 了，yyds 真是 yyds。",  # 3 次 yyds
        "家人们快冲！家人们不要错过",  # 2 次家人们（已知）
        "这个博主真的很专业很客观",  # 0 次
    ]

    # Mock persona
    persona = {
        "dimensions": {
            "forbidden_phrases": ["绝对", "100%"]  # 用户自定义
        }
    }

    effective, breakdown = extract_forbidden_phrases(
        defaults=defaults,
        corpus_texts=corpus,
        persona=persona,
        min_freq=2,  # 降低阈值便于测试
    )
    print("=== self-test ===")
    print(f"defaults: {breakdown['defaults']} (curated)")
    print(f"corpus:   {breakdown['corpus']} (auto-extracted)")
    print(f"user:     {breakdown['user']} (explicit)")
    print(f"total:    {breakdown['total']}")
    print()
    print("effective (前 20):", effective[:20])
    print()
    # check_text 测试
    text = "yyds yyds 家人们 这是 yyds 风格的文"
    hits = check_text(text, effective)
    print(f"text: {text!r}")
    print(f"hits: {hits}")
    assert "yyds" in hits
    assert "家人们" in hits
    print("\nself-test OK")
