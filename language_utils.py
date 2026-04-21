"""Helpers to detect non-English surface text (titles/descriptions) and dubbed content."""

from __future__ import annotations

import re

HINDI_CHARS = set(range(0x0900, 0x097F + 1))

NON_ENGLISH_MARKERS = [
    " in hindi",
    "in hindi",
    "(hindi",
    "[hindi",
    "हिंदी",
    "हिन्दी",
    " urdu",
    "in urdu",
    " tamil",
    " telugu",
    " malayalam",
    " marathi",
    " kannada",
    " bengali",
    " auto dubbed",
    "auto-dub",
    " dubbed in",
    " hindi audio",
    "हिंदी में",
]


def has_devanagari(text: str) -> bool:
    return any(ord(c) in HINDI_CHARS for c in text)


def looks_non_english_for_english_request(title: str, description: str) -> bool:
    """True if metadata suggests the video is not English (incl. auto-dubbed Hindi)."""
    combined = (title + " " + description).lower()
    if has_devanagari(title + description):
        return True
    for marker in NON_ENGLISH_MARKERS:
        if marker in combined:
            return True
    return False


def english_transcript_mismatch(transcript_sample: str, user_lang: str) -> bool:
    """Heuristic: transcript is clearly Hindi but user asked for English."""
    if user_lang.lower() != "english" or not transcript_sample:
        return False
    sample = transcript_sample[:1200]
    hindi_chars = sum(1 for c in sample if "\u0900" <= c <= "\u097f")
    if hindi_chars > 25:
        return True
    hindi_words = (
        " कि ", " में ", " है ", " और ", " को ", " से ", " नहीं ",
        "हैं", "करते", "लिए", "वीडियो",
    )
    if sum(1 for w in hindi_words if w in sample) >= 4:
        return True
    return False
