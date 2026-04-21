import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Play, X } from 'lucide-react'
import posthog from 'posthog-js'

const BADGE_STYLES = {
  'MOST POPULAR': 'bg-red-50 text-red-600 border-red-100',
  'EXPERT PICK': 'bg-purple-50 text-purple-600 border-purple-100',
  'QUICK LESSON': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'TOP RATED': 'bg-amber-50 text-amber-600 border-amber-100',
  'BEST FOR BEGINNERS': 'bg-blue-50 text-blue-600 border-blue-100',
}

/** Extract 11-char video id from common YouTube URL shapes. */
function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id?.slice(0, 11) || ''
    }
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v && v.length >= 6) return v.slice(0, 11)
      const parts = u.pathname.split('/').filter(Boolean)
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1].slice(0, 11)
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1].slice(0, 11)
    }
  } catch {
    /* fall through */
  }
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : ''
}

function getBadge(index, video) {
  if (index === 0) return 'MOST POPULAR'
  if (index === 1) return 'EXPERT PICK'
  if (video.duration && parseDuration(video.duration) <= 600) return 'QUICK LESSON'
  if (video.ai_score >= 0.85) return 'TOP RATED'
  return 'BEST FOR BEGINNERS'
}

function parseDuration(dur) {
  const parts = dur.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function WatchVideoDialog({ video, onClose }) {
  const videoId = getYouTubeVideoId(video?.url)
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`
    : ''

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!video) return null

  const summaryPreview = video.summary?.length ? video.summary.slice(0, 4) : []

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="watch-dialog-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="relative flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-gray-200/80 bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Video first — full width at top */}
        <div className="relative shrink-0 bg-black sm:rounded-t-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </button>
          {embedUrl ? (
            <div className="aspect-video w-full overflow-hidden sm:rounded-t-2xl">
              <iframe
                title={video.title || 'YouTube video'}
                src={embedUrl}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="px-4 py-8 sm:px-8">
              <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not load this video URL.
              </p>
            </div>
          )}
        </div>

        {/* Title + meta + copy — same alignment & typography as before (px-5 / sm:px-8) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
            <h2
              id="watch-dialog-title"
              className="text-xl font-bold leading-snug tracking-tight text-gray-900 sm:text-2xl"
              style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
            >
              {video.title}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                  {video.channel?.[0]?.toUpperCase()}
                </span>
                <span className="font-medium text-gray-700">{video.channel}</span>
              </span>
              {video.duration && (
                <>
                  <span className="text-gray-300" aria-hidden>
                    ·
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">{video.duration}</span>
                </>
              )}
            </p>

            <div className="mt-5">
              {video.reason && (
                <p className="text-[15px] leading-relaxed text-gray-700 sm:text-base">{video.reason}</p>
              )}
              {!video.reason && !summaryPreview.length && (
                <p className="text-sm text-gray-500">Use the player above to watch this pick.</p>
              )}
              {summaryPreview.length > 0 && (
                <div className={video.reason ? 'mt-5' : ''}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">At a glance</p>
                  <ul className="space-y-2">
                    {summaryPreview.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-8">
          {video.url && (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => posthog.capture('video_opened_in_youtube', {
                video_title: video.title,
                video_channel: video.channel,
                video_url: video.url,
                source: 'watch_dialog',
              })}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary"
            >
              Open in YouTube
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function VideoCard({ video, index, onOpenWatch }) {
  const badge = getBadge(index, video)
  const badgeStyle = BADGE_STYLES[badge] || BADGE_STYLES['BEST FOR BEGINNERS']
  const videoId = getYouTubeVideoId(video.url)
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
  const canWatch = Boolean(getYouTubeVideoId(video.url))

  return (
    <article
      className="fade-in-up bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200/80 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full md:w-[min(100%,320px)] md:min-w-[280px] md:max-w-[320px] aspect-video md:aspect-auto md:h-[220px] bg-black shrink-0 rounded-none md:rounded-l-2xl overflow-hidden">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-900" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <button
            type="button"
            onClick={() => onOpenWatch(video)}
            disabled={!canWatch}
            className="absolute inset-0 flex items-center justify-center transition-colors group/ctrl disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Open video player"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg transition-transform duration-200 group-hover/ctrl:scale-105 group-hover/ctrl:shadow-xl">
              <Play className="ml-1 h-7 w-7" fill="currentColor" />
            </span>
          </button>
          {video.duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-xs text-white">
              {video.duration}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-snug text-gray-900">{video.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">
                  {video.channel?.[0]?.toUpperCase()}
                </span>
                {video.channel}
              </p>
            </div>
            <span
              className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}
            >
              {badge}
            </span>
          </div>

          {video.reason && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-primary">Why this video?</p>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="text-sm leading-relaxed text-gray-700">{video.reason}</p>
              </div>
            </div>
          )}

          {video.summary?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-sm font-semibold text-gray-700">Quick Summary</p>
              <ul className="space-y-1">
                {video.summary.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <button
              type="button"
              onClick={() => onOpenWatch(video)}
              disabled={!canWatch}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark disabled:pointer-events-none disabled:opacity-50"
            >
              Watch
              <ArrowRight className="h-4 w-4" />
            </button>
            {video.url && (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => posthog.capture('video_opened_in_youtube', {
                  video_title: video.title,
                  video_channel: video.channel,
                  video_url: video.url,
                  source: 'results_card',
                })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary"
              >
                Open in YouTube
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function ResultsPage({ results, query, onBack }) {
  const [watchVideo, setWatchVideo] = useState(null)

  const handleOpenWatch = (video) => {
    posthog.capture('video_watch_opened', {
      video_title: video.title,
      video_channel: video.channel,
      video_url: video.url,
      video_duration: video.duration,
    })
    setWatchVideo(video)
  }

  const handleBack = () => {
    posthog.capture('new_search_clicked', {
      topic: query?.topic,
    })
    onBack()
  }

  if (!results?.length) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">No results found</h2>
        <p className="text-gray-500 mt-2">Try a different topic or broader filters.</p>
        <button
          onClick={handleBack}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary-dark"
        >
          Search Again
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 pt-8 pb-16">
      {watchVideo && <WatchVideoDialog video={watchVideo} onClose={() => setWatchVideo(null)} />}

      <div className="mb-8">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          New search
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Best videos for {query?.topic}</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-gray-500">
          We&apos;ve curated strong picks for{' '}
          <span className="font-medium text-gray-700">{query?.topic}</span>. Open <span className="font-medium text-gray-700">Watch</span> for a
          focused player with context, or use YouTube in a new tab.
        </p>
      </div>

      <div className="space-y-5">
        {results.map((video, i) => {
          const key = video.url || `result-${i}`
          return (
            <VideoCard key={key} video={video} index={i} onOpenWatch={handleOpenWatch} />
          )
        })}
      </div>
    </main>
  )
}
