"""Scoring: popularity first, comment appreciation second, ease of explanation third."""

from __future__ import annotations

import math
import re

from config import DURATION_PREFS, SCORE_WEIGHTS
from language_utils import english_transcript_mismatch, has_devanagari
from models import EnrichedVideo, RawVideo, ScoredVideo, UserQuery


def _keyword_relevance(title: str, description: str, topic: str) -> float:
    keywords = [kw.strip().lower() for kw in topic.split() if len(kw.strip()) > 1]
    if not keywords:
        return 0.0
    text = (title + " " + description).lower()
    hits = sum(1 for kw in keywords if kw in text)
    base = hits / len(keywords)
    title_lower = title.lower()
    title_hits = sum(1 for kw in keywords if kw in title_lower)
    title_bonus = 0.2 * (title_hits / len(keywords))
    return min(base + title_bonus, 1.0)


BEGINNER_SIGNALS = [
    "beginner", "basics", "basic", "easy", "introduction", "intro",
    "getting started", "for beginners", "from scratch", "step by step",
    "simplified", "simple", "crash course", "101", "learn", "explained",
]

ADVANCED_SIGNALS = [
    "advanced", "expert", "pro tips", "deep dive", "internals",
    "under the hood", "masterclass",
]


def _beginner_friendly(title: str, description: str, level: str) -> float:
    text = (title + " " + description).lower()
    pos = sum(1 for s in BEGINNER_SIGNALS if s in text)
    neg = sum(1 for s in ADVANCED_SIGNALS if s in text)
    if level.lower() == "beginner":
        score = min(pos * 0.2, 1.0) - min(neg * 0.3, 0.6)
    elif level.lower() == "advanced":
        score = min(neg * 0.2, 1.0)
    else:
        score = 0.5
    return max(0.0, min(score, 1.0))


def _days_since(published_text: str) -> float:
    if not published_text:
        return 365.0
    text = published_text.lower().strip()
    match = re.search(r"(\d+)\s*(year|month|week|day|hour|minute)", text)
    if not match:
        return 365.0
    n = int(match.group(1))
    unit = match.group(2)
    multipliers = {
        "year": 365, "month": 30, "week": 7,
        "day": 1, "hour": 1 / 24, "minute": 1 / 1440,
    }
    return n * multipliers.get(unit, 365)


def _engagement_raw(views: int, days: float) -> float:
    return views / (days + 1)


def _freshness(days: float) -> float:
    return 1.0 / (1.0 + math.log1p(days))


def _duration_match(duration_sec: int, pref: str) -> float:
    lo, hi = DURATION_PREFS.get(pref.lower(), (300, 1200))
    if lo <= duration_sec <= hi:
        return 1.0
    if duration_sec < lo:
        return max(0.0, 1.0 - (lo - duration_sec) / lo)
    return max(0.0, 1.0 - (duration_sec - hi) / hi)


LANGUAGE_KEYWORDS = {
    "hindi": ["hindi", "in hindi", "\u0939\u093f\u0928\u094d\u0926\u0940", "\u0939\u093f\u0902\u0926\u0940"],
    "spanish": ["español", "en español", "spanish"],
    "french": ["français", "en français", "french"],
    "german": ["deutsch", "auf deutsch", "german"],
}


def _language_match(
    title: str,
    description: str,
    language: str,
    detected_lang: str = "",
    transcript_sample: str = "",
) -> float:
    lang = language.lower()
    text = (title + " " + description).lower()

    if lang == "english":
        for _l, kws in LANGUAGE_KEYWORDS.items():
            if any(kw in text for kw in kws):
                return 0.0
        if has_devanagari(title + description):
            return 0.0
        if detected_lang == "hindi":
            return 0.0
        if transcript_sample and english_transcript_mismatch(transcript_sample, "english"):
            return 0.0
        return 1.0

    if detected_lang:
        if detected_lang.lower() == lang:
            return 1.0
        if detected_lang.lower() != lang and detected_lang != "unknown":
            return 0.0

    if lang == "hindi":
        if has_devanagari(title + description):
            return 1.0

    kws = LANGUAGE_KEYWORDS.get(lang, [lang])
    if any(kw in text for kw in kws):
        return 1.0

    return 0.0


def _popularity(views: int, engagement_normalized: float) -> float:
    """Blend absolute reach (log views) with velocity (views per day)."""
    log_v = min(math.log1p(max(views, 0)) / math.log1p(8_000_000), 1.0)
    return 0.55 * log_v + 0.45 * engagement_normalized


def _ease_explanation(beginner: float, comment_clarity: float | None) -> float:
    if comment_clarity is None:
        return beginner
    return min(0.45 * beginner + 0.55 * comment_clarity, 1.0)


def score_videos(videos: list[RawVideo], query: UserQuery) -> list[ScoredVideo]:
    scored: list[ScoredVideo] = []
    eng_values: list[float] = []

    preliminary: list[tuple[RawVideo, dict[str, float], float]] = []
    for v in videos:
        days = _days_since(v.published_at)
        eng = _engagement_raw(v.views, days)
        eng_values.append(eng)
        bf = _beginner_friendly(v.title, v.description, query.level)
        scores = {
            "relevance": _keyword_relevance(v.title, v.description, query.topic),
            "popularity": 0.0,
            "ease_explanation": _ease_explanation(bf, None),
            "comment_appreciation": 0.5,
            "freshness": _freshness(days),
            "duration_match": _duration_match(v.duration_sec, query.duration),
            "language_match": _language_match(v.title, v.description, query.language),
            "comment_topic_relevance": 0.0,
        }
        preliminary.append((v, scores, eng))

    max_eng = max(eng_values) if eng_values else 1.0

    for v, scores, eng in preliminary:
        eng_norm = eng / max_eng if max_eng > 0 else 0.0
        scores["popularity"] = _popularity(v.views, eng_norm)

        system_score = sum(SCORE_WEIGHTS[k] * scores[k] for k in SCORE_WEIGHTS)

        scored.append(
            ScoredVideo(
                **v.model_dump(),
                relevance=scores["relevance"],
                beginner_friendly=_beginner_friendly(v.title, v.description, query.level),
                engagement=eng_norm,
                freshness=scores["freshness"],
                duration_match=scores["duration_match"],
                language_match=scores["language_match"],
                system_score=system_score,
            )
        )

    scored.sort(key=lambda s: s.system_score, reverse=True)
    return scored


def enrich_and_rescore(
    scored: list[ScoredVideo],
    query: UserQuery,
    comment_data: dict[str, dict],
    transcript_data: dict[str, dict],
) -> list[EnrichedVideo]:
    eng_values: list[float] = []
    for v in scored:
        days = _days_since(v.published_at)
        eng_values.append(_engagement_raw(v.views, days))
    max_eng = max(eng_values) if eng_values else 1.0

    enriched: list[EnrichedVideo] = []
    for v in scored:
        cd = comment_data.get(v.video_id, {})
        td = transcript_data.get(v.video_id, {})

        days = _days_since(v.published_at)
        eng_norm = _engagement_raw(v.views, days) / max_eng if max_eng > 0 else 0.0
        pop = _popularity(v.views, eng_norm)

        appr = cd.get("appreciation", cd.get("sentiment", 0.5))
        clarity_c = cd.get("clarity_ease", 0.5)
        topic_rel = cd.get("relevance", 0.0)

        bf = _beginner_friendly(v.title, v.description, query.level)
        ease = _ease_explanation(bf, clarity_c)

        transcript_coverage = td.get("coverage", 0.0)
        relevance_boost = min(v.relevance + 0.12 * transcript_coverage, 1.0)

        snippet = td.get("snippet", "")
        detected = td.get("detected_language", "")
        lang_score = _language_match(
            v.title, v.description, query.language, detected, snippet
        )

        scores = {
            "relevance": relevance_boost,
            "popularity": pop,
            "ease_explanation": ease,
            "comment_appreciation": appr,
            "freshness": v.freshness,
            "duration_match": v.duration_match,
            "language_match": lang_score,
            "comment_topic_relevance": topic_rel,
        }
        system_score = sum(SCORE_WEIGHTS[k] * scores[k] for k in SCORE_WEIGHTS)

        base = v.model_dump()
        base.update(
            comments=cd.get("top_comments", []),
            comment_sentiment=cd.get("sentiment", appr),
            comment_topic_relevance=topic_rel,
            comment_quality=appr,
            transcript_snippet=snippet,
            topic_coverage=transcript_coverage,
            detected_language=detected,
            channel_authority=pop,
            system_score=system_score,
            relevance=relevance_boost,
            language_match=lang_score,
        )
        enriched.append(EnrichedVideo(**base))

    enriched.sort(key=lambda e: e.system_score, reverse=True)
    return enriched
