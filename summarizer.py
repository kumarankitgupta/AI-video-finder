"""AI summary generation for the final selected videos."""

from __future__ import annotations

import json
import re

import httpx

from config import API_URL, MODEL, OPENROUTER_API_KEY
from models import FinalVideo


def _build_summary_prompt(videos: list[FinalVideo]) -> str:
    block = ""
    for i, v in enumerate(videos):
        block += f"\n{i+1}. Title: {v.title}\n   Channel: {v.channel}\n   Duration: {v.duration}\n"

    return f"""You are an expert educator.

For each video below, write a summary as exactly 4 bullet points.

Rules:
- Use simple language a beginner can understand
- No jargon
- Focus on what the viewer will learn
- Each bullet should be a short phrase (5-10 words)

Videos:
{block}

Return ONLY a JSON array of objects.
Each object: {{"video_index": <1-based>, "summary": ["point1", "point2", "point3", "point4"]}}
No markdown fences, no extra text.
"""


def _parse_summary_response(text: str) -> dict[int, list[str]]:
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
            return {}
    return {item["video_index"]: item["summary"] for item in data}


def generate_summaries(videos: list[FinalVideo]) -> list[FinalVideo]:
    if not videos:
        return videos

    prompt = _build_summary_prompt(videos)

    response = httpx.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
        },
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()
    content = body["choices"][0]["message"]["content"]
    summaries = _parse_summary_response(content)

    for i, v in enumerate(videos):
        v.summary = summaries.get(i + 1, ["Summary not available"])
    return videos
