# AI Video Finder Engine

An AI-powered video selection engine that finds the **best learning videos** — not just the most popular ones.

## How It Works

1. **Fetch** — Searches YouTube for 25 candidate videos using smart queries
2. **Clean** — Filters out irrelevant, off-topic, or low-quality results
3. **Score** — Ranks videos across 6 dimensions (relevance, beginner-friendliness, engagement, freshness, duration match, language match)
4. **AI Evaluate** — Sends top 10 to Gemini for clarity/depth/accessibility ratings
5. **Select** — Blends system + AI scores to pick the top 5
6. **Summarize** — Generates 4-bullet-point learning summaries per video

## Setup

```bash
cd ai-video-finder

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your API key in .env
# OPENROUTER_API_KEY=your-key-here
```

## Usage

```bash
# Interactive mode
python main.py

# Pass topic as argument
python main.py flexbox
python main.py "python decorators"
```

## Configuration

Edit `.env`:

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `MODEL` | LLM model to use (default: `google/gemini-3-flash-preview`) |
| `API_URL` | OpenRouter chat completions endpoint |

Edit `config.py` for scoring weights, fetch limits, and duration preferences.

## Scoring Formula

```
score = 0.35 * relevance
      + 0.20 * beginner_friendly
      + 0.15 * engagement
      + 0.10 * freshness
      + 0.10 * duration_match
      + 0.10 * language_match
```

Final ranking blends system score (60%) with AI evaluation (40%).

## Project Structure

```
ai-video-finder/
├── main.py            # CLI entry point + pipeline orchestration
├── config.py          # All configuration & weights
├── models.py          # Pydantic data models
├── fetcher.py         # YouTube video fetching
├── cleaner.py         # Data cleaning & filtering
├── scorer.py          # 6-dimension scoring engine
├── ai_evaluator.py    # OpenRouter AI evaluation
├── summarizer.py      # AI summary generation
├── cache.py           # File-based caching
├── .env               # API keys (not committed)
└── requirements.txt   # Python dependencies
```
