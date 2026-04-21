import { useState, useCallback } from 'react'
import posthog from 'posthog-js'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoadingPage from './pages/LoadingPage'
import ResultsPage from './pages/ResultsPage'

const STAGES = [
  'Fetching videos...',
  'Metadata indexed',
  'Quality scoring',
  'AI evaluation',
  'Generating summaries',
]

export default function App() {
  const [view, setView] = useState('home')
  const [query, setQuery] = useState(null)
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [focusLandingSearchKey, setFocusLandingSearchKey] = useState(0)
  const [landingSearchTopicHint, setLandingSearchTopicHint] = useState('')

  const handleSearch = useCallback(async (searchQuery) => {
    setQuery(searchQuery)
    setView('loading')
    setProgress(0)
    setStage(STAGES[0])

    posthog.capture('search_submitted', {
      topic: searchQuery.topic,
      level: searchQuery.level,
      language: searchQuery.language,
      duration: searchQuery.duration,
    })

    const progressTimer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.random() * 15 + 5, 90)
        const idx = Math.min(Math.floor(next / 20), STAGES.length - 1)
        setStage(STAGES[idx])
        return next
      })
    }, 800)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchQuery),
      })
      const data = await res.json()
      clearInterval(progressTimer)
      setProgress(100)
      setStage('Done!')
      posthog.capture('search_completed', {
        topic: searchQuery.topic,
        level: searchQuery.level,
        language: searchQuery.language,
        duration: searchQuery.duration,
        result_count: (data.results || []).length,
      })
      setTimeout(() => {
        setResults(data.results || [])
        setView('results')
      }, 400)
    } catch (err) {
      clearInterval(progressTimer)
      console.error(err)
      posthog.capture('search_failed', {
        topic: searchQuery.topic,
        level: searchQuery.level,
        language: searchQuery.language,
        duration: searchQuery.duration,
        error: err?.message,
      })
      posthog.captureException(err)
      setView('home')
    }
  }, [])

  const handleBack = useCallback(() => {
    setView('home')
    setResults([])
    setQuery(null)
  }, [])

  const goToLandingSearch = useCallback(() => {
    setLandingSearchTopicHint(query?.topic ?? '')
    setResults([])
    setQuery(null)
    setView('home')
    setFocusLandingSearchKey((k) => k + 1)
  }, [query])

  return (
    <div className="min-h-screen bg-surface">
      {view !== 'home' && (
        <Navbar
          query={query}
          showNav={view === 'results'}
          onBack={handleBack}
          onGoToLandingSearch={goToLandingSearch}
        />
      )}
      {view === 'home' && (
        <HomePage
          onSearch={handleSearch}
          focusLandingSearchKey={focusLandingSearchKey}
          landingSearchTopicHint={landingSearchTopicHint}
        />
      )}
      {view === 'loading' && (
        <LoadingPage progress={progress} stage={stage} />
      )}
      {view === 'results' && (
        <ResultsPage results={results} query={query} onBack={handleBack} />
      )}
    </div>
  )
}
