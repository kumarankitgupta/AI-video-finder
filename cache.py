"""Simple file-based caching layer keyed by query parameters."""

from __future__ import annotations

import hashlib
import json
import os
import time

from models import UserQuery

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
CACHE_TTL = 3600  # 1 hour


def _cache_key(query: UserQuery) -> str:
    raw = f"{query.topic}_{query.level}_{query.language}_{query.duration}".lower()
    return hashlib.md5(raw.encode()).hexdigest()


def get_cached(query: UserQuery) -> list[dict] | None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{_cache_key(query)}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        data = json.load(f)
    if time.time() - data.get("ts", 0) > CACHE_TTL:
        os.remove(path)
        return None
    return data.get("results")


def set_cache(query: UserQuery, results: list[dict]) -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{_cache_key(query)}.json")
    with open(path, "w") as f:
        json.dump({"ts": time.time(), "results": results}, f, indent=2)
