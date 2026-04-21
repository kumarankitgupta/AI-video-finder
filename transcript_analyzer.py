"""Fetch and analyze YouTube transcripts."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed

from models import RawVideo


def _fetch_transcript(video_id: str, user_language: str = "english") -> str:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        ytt_api = YouTubeTranscriptApi()
        ul = user_language.lower()
        if ul == "english":
            transcript = ytt_api.fetch(video_id, languages=["en"])
        elif ul == "hindi":
            transcript = ytt_api.fetch(video_id, languages=["hi", "en"])
        else:
            lang_code = {"spanish": "es", "french": "fr", "german": "de"}.get(ul, "en")
            transcript = ytt_api.fetch(video_id, languages=[lang_code, "en"])
        return " ".join(snippet.text for snippet in transcript.snippets)
    except Exception:
        return ""


def _topic_coverage(transcript: str, topic: str) -> float:
    if not transcript:
        return 0.0
    keywords = [kw.strip().lower() for kw in topic.split() if len(kw.strip()) > 2]
    if not keywords:
        return 0.0
    lower = transcript.lower()
    hits = sum(1 for kw in keywords if kw in lower)
    base = hits / len(keywords)
    depth_bonus = 0.0
    for kw in keywords:
        if lower.count(kw) > 5:
            depth_bonus += 0.1
    return min(base + depth_bonus, 1.0)


def _extract_snippet(transcript: str, max_words: int = 500) -> str:
    if not transcript:
        return ""
    words = transcript.split()
    return " ".join(words[:max_words])


def _detect_language(transcript: str) -> str:
    if not transcript:
        return "unknown"
    sample = transcript[:2000]
    hindi_chars = sum(1 for c in sample if "\u0900" <= c <= "\u097F")
    if hindi_chars > 12:
        return "hindi"
    spanish_markers = ["está", "pero", "también", "porque", "tenemos"]
    if sum(1 for m in spanish_markers if m in sample.lower()) >= 2:
        return "spanish"
    return "english"


def analyze_transcripts(
    videos: list[RawVideo], topic: str, language: str = "english", max_workers: int = 5
) -> dict[str, dict]:
    results: dict[str, dict] = {}

    def _process(v: RawVideo) -> tuple[str, dict]:
        transcript = _fetch_transcript(v.video_id, language)
        return v.video_id, {
            "snippet": _extract_snippet(transcript),
            "coverage": _topic_coverage(transcript, topic),
            "detected_language": _detect_language(transcript),
            "has_transcript": bool(transcript),
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
                    "snippet": "",
                    "coverage": 0.0,
                    "detected_language": "unknown",
                    "has_transcript": False,
                }
    return results
