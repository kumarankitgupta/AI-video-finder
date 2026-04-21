"""Analyze YouTube comments: appreciation, clarity/ease, topic relevance."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed

from models import RawVideo

APPRECIATION = [
    "thank you", "thanks", "thanks a lot", "thank u", "thx",
    "love this", "loved", "amazing", "awesome", "great video", "great tutorial",
    "best tutorial", "best explanation", "helped me", "helped a lot",
    "very helpful", "so helpful", "underrated", "gem", "gold",
    "subscribed", "new subscriber", "bookmark", "saved",
    "respect", "legend", "goat", "fire", "perfect",
    "appreciate", "grateful", "bless you", "life saver", "lifesaver",
]

CLARITY_EASE = [
    "easy to understand", "easy to follow", "clear explanation", "clearly explained",
    "well explained", "simple", "simply", "finally understood", "finally understand",
    "makes sense", "understood", "great explanation", "nicely explained",
    "step by step", "slow and", "beginner friendly", "for beginners",
    "no jargon", "straightforward", "well structured",
]

NEGATIVE = [
    "confusing", "waste of time", "too fast", "not clear", "bad explanation",
    "misleading", "clickbait", "wrong",
]


def _fetch_comments_for_video(video_id: str, limit: int = 25) -> list[str]:
    try:
        from youtubesearchpython import Comments
        c = Comments(f"https://www.youtube.com/watch?v={video_id}")
        raw = c.comments.get("result", [])
        return [
            item.get("comment", "")
            for item in raw[:limit]
            if item.get("comment")
        ]
    except Exception:
        return []


def _score_phrases(comments: list[str], phrases: list[str]) -> float:
    if not comments:
        return 0.5
    hits = 0
    for c in comments:
        lower = c.lower()
        hits += sum(1 for p in phrases if p in lower)
    return min(hits / max(len(comments) * 2, 1), 1.0)


def _appreciation(comments: list[str]) -> float:
    """How much viewers praise / thank — primary social proof."""
    pos = _score_phrases(comments, APPRECIATION)
    neg = _score_phrases(comments, NEGATIVE)
    raw = pos - neg * 0.5
    return max(0.0, min(0.5 + raw, 1.0))


def _clarity_ease(comments: list[str]) -> float:
    """How often comments say it was easy / clear to follow."""
    return _score_phrases(comments, CLARITY_EASE) if comments else 0.5


def _topic_relevance(comments: list[str], topic: str) -> float:
    if not comments:
        return 0.0
    keywords = [kw.strip().lower() for kw in topic.split() if len(kw.strip()) > 2]
    if not keywords:
        return 0.0
    mentions = 0
    for c in comments:
        lower = c.lower()
        if any(kw in lower for kw in keywords):
            mentions += 1
    return min(mentions / len(comments), 1.0)


def _pick_representative_comments(comments: list[str], limit: int = 5) -> list[str]:
    if len(comments) <= limit:
        return comments
    scored = []
    for c in comments:
        lower = c.lower()
        has_signal = any(
            s in lower for s in APPRECIATION + CLARITY_EASE + NEGATIVE
        )
        scored.append((len(c) + (200 if has_signal else 0), c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]


def analyze_comments(
    videos: list[RawVideo], topic: str, max_workers: int = 5
) -> dict[str, dict]:
    """Returns per video: appreciation, clarity_ease, sentiment (compat), relevance, top_comments."""

    results: dict[str, dict] = {}

    def _process(v: RawVideo) -> tuple[str, dict]:
        comments = _fetch_comments_for_video(v.video_id)
        appr = _appreciation(comments)
        clarity = _clarity_ease(comments)
        rel = _topic_relevance(comments, topic)
        sentiment = 0.5 * appr + 0.5 * clarity
        return v.video_id, {
            "appreciation": appr,
            "clarity_ease": clarity,
            "sentiment": sentiment,
            "relevance": rel,
            "top_comments": _pick_representative_comments(comments),
            "comment_count": len(comments),
        }

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_process, v): v for v in videos}
        for fut in as_completed(futures):
            try:
                vid_id, data = fut.result()
                results[vid_id] = data
            except Exception:
                v = futures[fut]
                results[v.video_id] = {
                    "appreciation": 0.5,
                    "clarity_ease": 0.5,
                    "sentiment": 0.5,
                    "relevance": 0.0,
                    "top_comments": [],
                    "comment_count": 0,
                }
    return results
