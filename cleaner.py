"""Clean and filter raw video results."""

from __future__ import annotations

from config import DURATION_PREFS, FILTER_TITLE_BLACKLIST, MAX_DURATION_HARD
from language_utils import looks_non_english_for_english_request
from models import RawVideo, UserQuery


def _title_blacklisted(title: str) -> bool:
    lower = title.lower()
    return any(term in lower for term in FILTER_TITLE_BLACKLIST)


def _topic_present(title: str, description: str, topic: str) -> bool:
    keywords = [kw.strip().lower() for kw in topic.split() if len(kw.strip()) > 2]
    combined = (title + " " + description).lower()
    return any(kw in combined for kw in keywords)


def _language_ok_non_english(title: str, description: str, language: str) -> bool:
    from language_utils import has_devanagari

    lang = language.lower()
    text = (title + " " + description).lower()

    LANGUAGE_KEYWORDS = {
        "hindi": ["hindi", "in hindi", "\u0939\u093f\u0928\u094d\u0926\u0940", "\u0939\u093f\u0902\u0926\u0940"],
        "spanish": ["español", "en español"],
        "french": ["français", "en français"],
        "german": ["deutsch", "auf deutsch"],
    }

    if lang == "hindi":
        if has_devanagari(title + description):
            return True
        kws = LANGUAGE_KEYWORDS.get("hindi", [])
        return any(kw in text for kw in kws)

    kws = LANGUAGE_KEYWORDS.get(lang, [lang])
    return any(kw in text for kw in kws)


def clean_videos(videos: list[RawVideo], query: UserQuery) -> list[RawVideo]:
    duration_pref = query.duration.lower()
    _, max_dur = DURATION_PREFS.get(duration_pref, (0, MAX_DURATION_HARD))
    hard_cap = max(max_dur * 2, MAX_DURATION_HARD)

    lang = query.language.lower()
    primary: list[RawVideo] = []
    fallback: list[RawVideo] = []

    for v in videos:
        if _title_blacklisted(v.title):
            continue
        if v.duration_sec > hard_cap:
            continue
        if not _topic_present(v.title, v.description, query.topic):
            continue
        if v.duration_sec == 0:
            continue

        if lang == "english":
            if looks_non_english_for_english_request(v.title, v.description):
                fallback.append(v)
            else:
                primary.append(v)
        elif _language_ok_non_english(v.title, v.description, lang):
            primary.append(v)
        else:
            fallback.append(v)

    if lang == "english":
        return primary

    if len(primary) >= 5:
        return primary
    return primary + fallback
