from __future__ import annotations

from pydantic import BaseModel, Field


class UserQuery(BaseModel):
    topic: str
    level: str = "beginner"
    language: str = "english"
    duration: str = "short"


class RawVideo(BaseModel):
    video_id: str
    title: str
    description: str = ""
    duration_sec: int = 0
    views: int = 0
    published_at: str = ""
    channel: str = ""
    channel_subscribers: str = ""
    url: str = ""


class ScoredVideo(RawVideo):
    relevance: float = 0.0
    beginner_friendly: float = 0.0
    engagement: float = 0.0
    freshness: float = 0.0
    duration_match: float = 0.0
    language_match: float = 0.0
    system_score: float = 0.0


class EnrichedVideo(ScoredVideo):
    """ScoredVideo + deep quality signals from comments, transcripts, and channel data."""
    comments: list[str] = Field(default_factory=list)
    comment_sentiment: float = 0.5
    comment_topic_relevance: float = 0.0
    comment_quality: float = 0.0
    transcript_snippet: str = ""
    topic_coverage: float = 0.0
    detected_language: str = ""
    channel_authority: float = 0.0


class AIEvaluation(BaseModel):
    video_index: int
    clarity: float = 0.0
    beginner_score: float = 0.0
    depth: float = 0.0
    teaching_quality: float = 0.0
    content_accuracy: float = 0.0
    reason: str = ""

    @property
    def normalized(self) -> float:
        return (
            self.clarity
            + self.beginner_score
            + self.depth
            + self.teaching_quality
            + self.content_accuracy
        ) / 50.0


class FinalVideo(BaseModel):
    title: str
    url: str
    duration: str
    channel: str = ""
    system_score: float = 0.0
    ai_score: float = 0.0
    final_score: float = 0.0
    reason: str = ""
    summary: list[str] = Field(default_factory=list)
