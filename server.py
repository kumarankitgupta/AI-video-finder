"""FastAPI backend wrapping the V2 video finder pipeline."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import UserQuery, FinalVideo
from config import (
    TOP_K_FOR_AI, FINAL_TOP_K, FINAL_BLEND, ENRICH_TOP_K,
    ENABLE_QUERY_EXPANSION, ENABLE_COMMENTS, ENABLE_TRANSCRIPTS,
)


class SearchRequest(BaseModel):
    topic: str
    level: str = "beginner"
    language: str = "english"
    duration: str = "short"


class SearchResponse(BaseModel):
    results: list[FinalVideo]
    cached: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AI Video Finder V2", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _fmt(s: int) -> str:
    m, sec = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def _run_pipeline(query: UserQuery) -> tuple[list[FinalVideo], bool]:
    from cache import get_cached, set_cache
    from fetcher import fetch_videos, fetch_videos_multi
    from cleaner import clean_videos
    from scorer import score_videos, enrich_and_rescore
    from ai_evaluator import evaluate_videos
    from summarizer import generate_summaries

    cached = get_cached(query)
    if cached:
        return [FinalVideo(**v) for v in cached], True

    # Step 1 — Fetch (with optional query expansion)
    if ENABLE_QUERY_EXPANSION:
        try:
            from query_expander import expand_queries
            queries = expand_queries(query)
            raw = fetch_videos_multi(queries)
        except Exception:
            raw = fetch_videos(query)
    else:
        raw = fetch_videos(query)

    # Step 2 — Clean
    cleaned = clean_videos(raw, query)
    if not cleaned:
        return [], False

    # Step 3 — Initial score
    scored = score_videos(cleaned, query)

    # Step 4 — Enrich top candidates with comments + transcripts
    top_for_enrichment = scored[:ENRICH_TOP_K]
    comment_data: dict[str, dict] = {}
    transcript_data: dict[str, dict] = {}

    if ENABLE_COMMENTS:
        try:
            from comment_analyzer import analyze_comments
            comment_data = analyze_comments(top_for_enrichment, query.topic)
        except Exception:
            pass

    if ENABLE_TRANSCRIPTS:
        try:
            from transcript_analyzer import analyze_transcripts
            transcript_data = analyze_transcripts(
                top_for_enrichment, query.topic, query.language
            )
        except Exception:
            pass

    # Step 5 — Re-score with enrichment data
    enriched = enrich_and_rescore(top_for_enrichment, query, comment_data, transcript_data)

    # Step 6 — AI Evaluation (top K)
    top_candidates = enriched[:TOP_K_FOR_AI]
    try:
        evals = evaluate_videos(top_candidates, query)
    except Exception:
        evals = []

    # Step 7 — Blend scores
    eval_map = {ev.video_index: ev for ev in evals}
    finals: list[FinalVideo] = []
    for i, v in enumerate(top_candidates):
        ai_eval = eval_map.get(i + 1)
        ai_score = ai_eval.normalized if ai_eval else 0.0
        final_score = FINAL_BLEND["system"] * v.system_score + FINAL_BLEND["ai"] * ai_score
        reason = ai_eval.reason if ai_eval else "Selected by scoring engine"

        finals.append(FinalVideo(
            title=v.title,
            url=v.url,
            duration=_fmt(v.duration_sec),
            channel=v.channel,
            system_score=round(v.system_score, 3),
            ai_score=round(ai_score, 3),
            final_score=round(final_score, 3),
            reason=reason,
        ))

    finals.sort(key=lambda f: f.final_score, reverse=True)
    finals = finals[:FINAL_TOP_K]

    # Step 8 — Summaries
    try:
        finals = generate_summaries(finals)
    except Exception:
        pass

    set_cache(query, [f.model_dump() for f in finals])
    return finals, False


@app.post("/api/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    query = UserQuery(
        topic=req.topic,
        level=req.level,
        language=req.language,
        duration=req.duration,
    )
    loop = asyncio.get_event_loop()
    results, cached = await loop.run_in_executor(None, _run_pipeline, query)
    return SearchResponse(results=results, cached=cached)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
