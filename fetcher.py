"""Fetch videos from YouTube using youtube-search-python (no API key needed)."""

from __future__ import annotations

import re
from datetime import datetime, timezone

import patch_yt  # noqa: F401 — monkey-patch for httpx compat
from youtubesearchpython import VideosSearch

from config import FETCH_LIMIT
from models import RawVideo, UserQuery


def _parse_duration(text: str) -> int:
    if not text:
        return 0
    parts = text.split(":")
    parts = [int(p) for p in parts]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0]


def _parse_views(text: str) -> int:
    """Parse view counts like '558,000 views', '1.2M views', '190K views'."""
    if not text:
        return 0
    text = text.lower().replace(",", "").strip()
    match = re.search(r"([\d.]+)\s*(b|m|k)?", text)
    if not match:
        return 0
    n = float(match.group(1))
    unit = (match.group(2) or "").lower()
    multiplier = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}.get(unit, 1)
    return int(n * multiplier)


def _normalize_topic(topic: str) -> str:
    return (
        topic.replace("leet code", "leetcode")
        .replace("Leet Code", "leetcode")
        .replace("LEET CODE", "leetcode")
    )


def _build_query(query: UserQuery) -> str:
    topic = _normalize_topic(query.topic)
    parts = [topic, "tutorial"]
    if query.level:
        parts.append(query.level)
    if query.language and query.language.lower() != "english":
        parts.append(f"in {query.language}")
    return " ".join(parts)


def _parse_result(r: dict) -> RawVideo | None:
    vid_id = r.get("id", "")
    if not vid_id:
        return None
    title = r.get("title", "")
    desc = r.get("descriptionSnippet")
    if isinstance(desc, list):
        desc = " ".join(d.get("text", "") for d in desc)
    elif not isinstance(desc, str):
        desc = ""

    duration_text = r.get("duration", "0:00")
    view_count = r.get("viewCount", {})
    if isinstance(view_count, dict):
        views_str = view_count.get("text", "0") or view_count.get("short", "0")
    else:
        views_str = str(view_count)

    published = r.get("publishedTime", "")
    channel_info = r.get("channel", {})
    channel_name = channel_info.get("name", "") if isinstance(channel_info, dict) else ""
    channel_subs = ""
    if isinstance(channel_info, dict):
        channel_subs = channel_info.get("subscribers", "") or ""

    return RawVideo(
        video_id=vid_id,
        title=title,
        description=desc,
        duration_sec=_parse_duration(duration_text or "0:00"),
        views=_parse_views(views_str),
        published_at=published,
        channel=channel_name,
        channel_subscribers=channel_subs,
        url=f"https://www.youtube.com/watch?v={vid_id}",
    )


def fetch_videos(query: UserQuery) -> list[RawVideo]:
    search_query = _build_query(query)
    search = VideosSearch(search_query, limit=FETCH_LIMIT)
    results = search.result().get("result", [])

    videos: list[RawVideo] = []
    for r in results:
        v = _parse_result(r)
        if v:
            videos.append(v)
    return videos


def fetch_videos_multi(queries: list[str], limit_per_query: int = 15) -> list[RawVideo]:
    """Fetch from multiple search queries and deduplicate by video_id."""
    seen: set[str] = set()
    videos: list[RawVideo] = []

    for q in queries:
        try:
            search = VideosSearch(q, limit=limit_per_query)
            results = search.result().get("result", [])
            for r in results:
                v = _parse_result(r)
                if v and v.video_id not in seen:
                    seen.add(v.video_id)
                    videos.append(v)
        except Exception:
            continue
    return videos
