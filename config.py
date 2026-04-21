import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("MODEL", "google/gemini-3-flash-preview")
API_URL = os.getenv("API_URL", "https://openrouter.ai/api/v1/chat/completions")

FETCH_LIMIT = 25
TOP_K_FOR_AI = 10
FINAL_TOP_K = 5
ENRICH_TOP_K = 15

ENABLE_QUERY_EXPANSION = True
ENABLE_COMMENTS = True
ENABLE_TRANSCRIPTS = True

SCORE_WEIGHTS = {
    "relevance": 0.08,
    "popularity": 0.32,
    "ease_explanation": 0.14,
    "comment_appreciation": 0.26,
    "freshness": 0.02,
    "duration_match": 0.04,
    "language_match": 0.12,
    "comment_topic_relevance": 0.02,
}

FINAL_BLEND = {
    "system": 0.6,
    "ai": 0.4,
}

DURATION_PREFS = {
    "short": (300, 1200),
    "medium": (600, 2400),
    "long": (1800, 7200),
}

FILTER_TITLE_BLACKLIST = ["meme", "funny", "edit", "shorts", "tiktok", "#shorts"]
MAX_DURATION_HARD = 7200
