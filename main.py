"""AI Video Finder Engine V2 — main entry point."""

from __future__ import annotations

import json
import sys
import time

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from models import UserQuery, FinalVideo
from config import (
    TOP_K_FOR_AI, FINAL_TOP_K, FINAL_BLEND, ENRICH_TOP_K,
    ENABLE_QUERY_EXPANSION, ENABLE_COMMENTS, ENABLE_TRANSCRIPTS,
)

console = Console()


def _format_duration(seconds: int) -> str:
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def run_pipeline(query: UserQuery) -> list[FinalVideo]:
    from cache import get_cached, set_cache

    cached = get_cached(query)
    if cached:
        console.print("[green]✓ Using cached results[/green]\n")
        return [FinalVideo(**v) for v in cached]

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # Step 1 — Fetch (with query expansion)
        if ENABLE_QUERY_EXPANSION:
            task = progress.add_task("Expanding search queries with AI...", total=None)
            try:
                from query_expander import expand_queries
                queries = expand_queries(query)
                progress.update(task, description=f"Generated {len(queries)} search queries")
                progress.remove_task(task)

                task = progress.add_task("Fetching videos from YouTube...", total=None)
                from fetcher import fetch_videos_multi
                raw = fetch_videos_multi(queries)
            except Exception:
                from fetcher import fetch_videos
                raw = fetch_videos(query)
            progress.update(task, description=f"Fetched {len(raw)} unique videos")
            progress.remove_task(task)
        else:
            task = progress.add_task("Fetching videos from YouTube...", total=None)
            from fetcher import fetch_videos
            raw = fetch_videos(query)
            progress.update(task, description=f"Fetched {len(raw)} videos")
            progress.remove_task(task)

        # Step 2 — Clean
        task = progress.add_task("Cleaning & filtering...", total=None)
        from cleaner import clean_videos
        cleaned = clean_videos(raw, query)
        progress.update(task, description=f"{len(cleaned)} videos after filtering")
        progress.remove_task(task)

        if not cleaned:
            console.print("[red]No videos survived filtering. Try a broader query.[/red]")
            return []

        # Step 3 — Initial score
        task = progress.add_task("Initial scoring & ranking...", total=None)
        from scorer import score_videos, enrich_and_rescore
        scored = score_videos(cleaned, query)
        progress.remove_task(task)

        # Step 4 — Enrich with comments + transcripts
        top_for_enrichment = scored[:ENRICH_TOP_K]
        comment_data: dict[str, dict] = {}
        transcript_data: dict[str, dict] = {}

        if ENABLE_COMMENTS:
            task = progress.add_task(f"Analyzing comments for {len(top_for_enrichment)} videos...", total=None)
            try:
                from comment_analyzer import analyze_comments
                comment_data = analyze_comments(top_for_enrichment, query.topic)
                has_comments = sum(1 for d in comment_data.values() if d.get("comment_count", 0) > 0)
                progress.update(task, description=f"Comments analyzed ({has_comments} videos with data)")
            except Exception as e:
                progress.update(task, description=f"Comment analysis skipped ({e})")
            progress.remove_task(task)

        if ENABLE_TRANSCRIPTS:
            task = progress.add_task(f"Fetching transcripts for {len(top_for_enrichment)} videos...", total=None)
            try:
                from transcript_analyzer import analyze_transcripts
                transcript_data = analyze_transcripts(
                    top_for_enrichment, query.topic, query.language
                )
                has_transcripts = sum(1 for d in transcript_data.values() if d.get("has_transcript"))
                progress.update(task, description=f"Transcripts fetched ({has_transcripts} available)")
            except Exception as e:
                progress.update(task, description=f"Transcript fetch skipped ({e})")
            progress.remove_task(task)

        # Step 5 — Re-score with enrichment
        task = progress.add_task("Re-scoring with deep quality signals...", total=None)
        enriched = enrich_and_rescore(top_for_enrichment, query, comment_data, transcript_data)
        progress.remove_task(task)

        # Step 6 — AI Evaluation (top K)
        top_candidates = enriched[:TOP_K_FOR_AI]
        task = progress.add_task(f"AI evaluating top {len(top_candidates)} (with transcripts + comments)...", total=None)
        from ai_evaluator import evaluate_videos
        try:
            evals = evaluate_videos(top_candidates, query)
        except Exception as e:
            console.print(f"[yellow]⚠ AI evaluation failed ({e}), using system scores only[/yellow]")
            evals = []
        progress.remove_task(task)

        # Step 7 — Blend scores
        eval_map = {ev.video_index: ev for ev in evals}
        finals: list[FinalVideo] = []
        for i, v in enumerate(top_candidates):
            ai_eval = eval_map.get(i + 1)
            ai_score = ai_eval.normalized if ai_eval else 0.0
            final_score = (
                FINAL_BLEND["system"] * v.system_score
                + FINAL_BLEND["ai"] * ai_score
            )
            reason = ai_eval.reason if ai_eval else "Selected by scoring engine"

            finals.append(
                FinalVideo(
                    title=v.title,
                    url=v.url,
                    duration=_format_duration(v.duration_sec),
                    channel=v.channel,
                    system_score=round(v.system_score, 3),
                    ai_score=round(ai_score, 3),
                    final_score=round(final_score, 3),
                    reason=reason,
                )
            )

        finals.sort(key=lambda f: f.final_score, reverse=True)
        finals = finals[:FINAL_TOP_K]

        # Step 8 — Summaries
        task = progress.add_task("Generating AI summaries...", total=None)
        from summarizer import generate_summaries
        try:
            finals = generate_summaries(finals)
        except Exception as e:
            console.print(f"[yellow]⚠ Summary generation failed ({e})[/yellow]")
        progress.remove_task(task)

    set_cache(query, [f.model_dump() for f in finals])
    return finals


def display_results(results: list[FinalVideo], query: UserQuery) -> None:
    console.print()
    console.print(
        Panel(
            f"[bold]Topic:[/bold] {query.topic}  |  "
            f"[bold]Level:[/bold] {query.level}  |  "
            f"[bold]Language:[/bold] {query.language}  |  "
            f"[bold]Duration:[/bold] {query.duration}",
            title="🎥 AI Video Finder V2 Results",
            border_style="blue",
        )
    )
    console.print()

    for rank, v in enumerate(results, 1):
        console.print(f"[bold cyan]#{rank}[/bold cyan] [bold]{v.title}[/bold]")
        console.print(f"    🔗 {v.url}")
        console.print(f"    📺 {v.channel}  |  ⏱ {v.duration}")
        console.print(
            f"    📊 Score: [green]{v.final_score:.3f}[/green] "
            f"(system={v.system_score:.3f}, ai={v.ai_score:.3f})"
        )
        console.print(f"    💡 [italic]{v.reason}[/italic]")
        if v.summary:
            console.print("    📝 Summary:")
            for point in v.summary:
                console.print(f"       • {point}")
        console.print()


def main() -> None:
    console.print(Panel("[bold]🎥 AI Video Finder Engine V2[/bold]\n[dim]Comments · Transcripts · Channel Authority · Smart Queries[/dim]", border_style="bright_blue"))
    console.print()

    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
    else:
        topic = console.input("[bold]Enter topic:[/bold] ").strip()
        if not topic:
            console.print("[red]Topic is required.[/red]")
            return

    level = console.input("[bold]Level[/bold] (beginner/intermediate/advanced) [beginner]: ").strip() or "beginner"
    language = console.input("[bold]Language[/bold] [english]: ").strip() or "english"
    duration = console.input("[bold]Duration[/bold] (short/medium/long) [short]: ").strip() or "short"

    query = UserQuery(topic=topic, level=level, language=language, duration=duration)

    console.print()
    start = time.time()
    results = run_pipeline(query)
    elapsed = time.time() - start

    if results:
        display_results(results, query)
        console.print(f"[dim]Completed in {elapsed:.1f}s[/dim]\n")
    else:
        console.print("[red]No results found.[/red]")


if __name__ == "__main__":
    main()
