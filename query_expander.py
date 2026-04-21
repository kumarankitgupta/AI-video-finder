"""AI-powered search query expansion for broader video discovery."""

from __future__ import annotations

import json
import re

import httpx

from config import API_URL, MODEL, OPENROUTER_API_KEY
from fetcher import _normalize_topic
from models import UserQuery


def expand_queries(query: UserQuery, num_variants: int = 2) -> list[str]:
    """Generate variant search queries using AI to find videos that keyword search misses."""
    lang = query.language.lower()
    lang_suffix = "" if lang == "english" else f" in {query.language}"
    topic = _normalize_topic(query.topic)
    original = f"{topic} tutorial {query.level}{lang_suffix}"

    lang_rules = (
        f"Every query must be phrased so YouTube returns that language (e.g. include 'in {query.language}' "
        "or native script keywords)."
        if lang != "english"
        else (
            "Generate ONLY English-language search queries. Do NOT include Hindi, Urdu, Tamil, "
            "Telugu, or other non-English words. Avoid terms that surface auto-dubbed or "
            "multilingual uploads."
        )
    )

    prompt = f"""Generate {num_variants} alternative YouTube search queries for finding the best learning videos.

Original topic: {query.topic}
Level: {query.level}
Language: {query.language}

Rules:
- Each query should find DIFFERENT videos than "{original}"
- Focus on how real learners would search
- Keep queries short (3-6 words)
- Don't just rephrase — think of related angles
- IMPORTANT — language: The user wants videos in {query.language}. {lang_rules}

Return ONLY a JSON array of strings. No markdown, no extra text.
Example: ["CSS flexbox explained simply", "learn flexbox from scratch"]"""

    try:
        response = httpx.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
            },
            timeout=15,
        )
        response.raise_for_status()
        body = response.json()
        text = body["choices"][0]["message"]["content"].strip()

        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

        variants = json.loads(text)
        if isinstance(variants, list):
            variants = [v for v in variants if isinstance(v, str)][:num_variants]
            return [original] + variants
    except Exception:
        pass

    return [original]
