"""AI evaluation layer — uses OpenRouter to rate top candidates with deep context."""

from __future__ import annotations

import json
import re

import httpx

from pydantic import ValidationError

from config import API_URL, MODEL, OPENROUTER_API_KEY
from models import AIEvaluation, EnrichedVideo, ScoredVideo, UserQuery


def _build_eval_prompt(videos: list, query: UserQuery) -> str:
    video_block = ""
    for i, v in enumerate(videos):
        mins = v.duration_sec // 60
        secs = v.duration_sec % 60
        block = (
            f"\n{i+1}. Title: {v.title}\n"
            f"   Channel: {v.channel}\n"
            f"   Duration: {mins}m{secs:02d}s\n"
            f"   Description: {v.description[:400]}\n"
        )

        if isinstance(v, EnrichedVideo):
            if v.channel_subscribers:
                block += f"   Subscribers: {v.channel_subscribers}\n"
            if v.comments:
                comments_text = " | ".join(c[:120] for c in v.comments[:5])
                block += f"   Top viewer comments: {comments_text}\n"
            if v.transcript_snippet:
                block += f"   Transcript excerpt: {v.transcript_snippet[:400]}\n"
            block += f"   Comment sentiment: {v.comment_sentiment:.2f}/1.0\n"
            block += f"   Topic coverage from transcript: {v.topic_coverage:.2f}/1.0\n"

        video_block += block

    return f"""You are an expert educator and content curator with deep experience evaluating learning material.

Goal: Evaluate which YouTube videos are BEST for learning a topic. You have access to viewer comments and transcript excerpts — use them to judge actual content quality, not just titles.

Ranking priorities (in order):
1) Popularity / reach — prefer videos many people watched (signals are already in metadata; do not ignore mass appeal).
2) Viewer appreciation — comments thanking the creator, calling it helpful, best explanation, etc.
3) Clarity and ease — how easy the teaching is for the stated level.

User profile:
- Topic: {query.topic}
- Level: {query.level}
- Language preference: {query.language} (if English, penalize videos that are clearly non-English or auto-dubbed other languages)

Here are the candidate videos:
{video_block}

For EACH video, provide:
1. clarity (0-10): How well-structured and clear is the explanation (use transcript/comments as evidence)
2. beginner_score (0-10): How accessible it is for the stated level
3. depth (0-10): Balance of depth vs simplicity appropriate for the level
4. teaching_quality (0-10): Does it teach (explain WHY) or just show (do this, do that)? Use comments and transcript to judge.
5. content_accuracy (0-10): Does the actual content match the title's promise? Are comments confirming it works?
6. reason (string): One concise sentence explaining your rating, citing specific evidence from comments or transcript

Return ONLY a JSON array. No markdown fences, no extra text.
Example format:
[{{"video_index": 1, "clarity": 9, "beginner_score": 10, "depth": 7, "teaching_quality": 8, "content_accuracy": 9, "reason": "Comments confirm clear visuals; transcript covers all core properties"}}]
"""


def _parse_ai_response(text: str) -> list[AIEvaluation]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            return []

    if isinstance(data, dict):
        for key in ("results", "evaluations", "videos", "data"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break
        else:
            return []

    if not isinstance(data, list):
        return []

    out: list[AIEvaluation] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        raw_idx = item.get("video_index")
        if raw_idx is None:
            continue
        try:
            item = {**item, "video_index": int(raw_idx)}
            out.append(AIEvaluation(**item))
        except (ValueError, TypeError, ValidationError):
            continue
    return out


def evaluate_videos(
    videos: list, query: UserQuery
) -> list[AIEvaluation]:
    prompt = _build_eval_prompt(videos, query)

    response = httpx.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        },
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()
    content = body["choices"][0]["message"]["content"]
    return _parse_ai_response(content)
