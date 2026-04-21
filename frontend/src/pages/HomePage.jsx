import { useRef, useState, useEffect } from 'react'
import { Search, ArrowDown, ArrowRight, X } from 'lucide-react'
import posthog from 'posthog-js'
import Reveal from '../components/Reveal'
import ComingSoonHint from '../components/ComingSoonHint'

function YouTubeMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  )
}

const LANGUAGES = ['English', 'Hindi', 'Spanish']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const DURATIONS = ['Short', 'Deep', 'Series']

/**
 * Hero mock uses “Python Tutorial for Beginners”—among the most searched learning-style queries on YouTube.
 * Cards = plausible top picks for that same search (beginner course, crash course, hands-on project).
 */
const MOCK_CARDS = [
  {
    img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80&auto=format&fit=crop',
    badge: '#1 CHOICE',
    title: 'Python Full Course for Beginners',
    desc: 'Start-to-finish path: syntax, data structures, and mini-projects—what most “learn Python” searches want first.',
    why: 'WHY: BEST FIT FOR BEGINNERS',
    icon: 'verified',
    iconFill: true,
  },
  {
    img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80&auto=format&fit=crop',
    title: 'Python in One Video — Crash Course',
    desc: 'Dense overview for viewers who search “Python tutorial” and need a fast on-ramp.',
    why: 'WHY: HIGHEST CLARITY',
    icon: 'star',
    iconFill: true,
  },
  {
    img: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80&auto=format&fit=crop',
    title: 'Build Your First Python Project (Step by Step)',
    desc: 'Hands-on build—matches demand for practical coding after the basics.',
    why: 'WHY: PRACTICAL & ACTIONABLE',
    icon: 'bolt',
    iconFill: true,
  },
]

const COLLECTION_CARDS = [
  { t: 'Next.js Mastery', n: '12 curated videos', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80&auto=format&fit=crop' },
  { t: 'Italian Cuisine', n: '8 curated videos', img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80&auto=format&fit=crop' },
  { t: 'Quantum Physics', n: '15 curated videos', img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80&auto=format&fit=crop' },
  { t: 'Stock Trading', n: '5 curated videos', img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80&auto=format&fit=crop' },
]

const NOISE_BAR_PX = [26, 42, 18, 48, 32, 44, 22, 50, 30, 40, 16, 46]

const YT_PAIN_POINTS = [
  { t: 'Ranked for watch time', d: 'Not for how well you’ll learn' },
  { t: 'Hundreds of “same” videos', d: 'No “best for your level”' },
  { t: 'Titles ≠ real content', d: 'Clickbait, intros, wrong language' },
]

const CURATOR_WINS = [
  { t: 'Ranked for teaching', d: 'Clarity, comments, transcripts' },
  { t: 'A tight shortlist', d: 'Matched to topic, level & language' },
  { t: 'You know why', d: 'Reasons + summaries before you click' },
]

function NoiseSignalStrip() {
  return (
    <div className="relative mx-auto max-w-lg md:max-w-none">
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-6 md:p-8 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row md:items-stretch gap-8 md:gap-0">
          {/* Noise */}
          <div className="flex-1 md:pr-8 md:border-r border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">YouTube search</p>
            <div className="flex items-end justify-between gap-1 h-[5.5rem] rounded-xl bg-slate-100/90 px-2 pb-2 pt-3 ring-1 ring-inset ring-slate-200/60">
              {NOISE_BAR_PX.map((px, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-[2px] bg-gradient-to-t from-slate-400 to-slate-300 opacity-90"
                  style={{ height: `${px}px` }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500 leading-snug">Noise — endless similar results to compare.</p>
          </div>

          <div className="flex md:hidden justify-center py-2 text-slate-300" aria-hidden>
            <ArrowDown className="w-5 h-5" strokeWidth={2} />
          </div>

          {/* Arrow — desktop */}
          <div className="hidden md:flex items-center justify-center px-2 text-slate-300">
            <ArrowRight className="w-6 h-6" strokeWidth={2} aria-hidden />
          </div>

          {/* Signal */}
          <div className="flex-1 md:pl-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">Curator</p>
            <div className="flex items-end justify-center gap-3 md:gap-4 h-[5.5rem] rounded-xl bg-gradient-to-br from-primary/[0.07] to-blue-50 px-4 pb-2 pt-3 ring-1 ring-inset ring-primary/10">
              {[72, 78, 68].map((px, i) => (
                <div
                  key={i}
                  className="w-full max-w-[4.5rem] rounded-md premium-gradient shadow-md shadow-primary/20"
                  style={{ height: `${px}px` }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-snug">
              Signal — a few picks scored for <span className="font-semibold text-slate-800">learning</span>, not hype.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
        selected
          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25'
          : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'
      }`}
    >
      {label}
    </button>
  )
}

export default function HomePage({ onSearch, focusLandingSearchKey = 0, landingSearchTopicHint = '' }) {
  const searchRef = useRef(null)
  const topicInputRef = useRef(null)
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('English')
  const [level, setLevel] = useState('Beginner')
  const [duration, setDuration] = useState('Short')
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (focusLandingSearchKey < 1) return
    if (landingSearchTopicHint) {
      setTopic(landingSearchTopicHint)
    }
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const t = window.setTimeout(() => {
      topicInputRef.current?.focus({ preventScroll: true })
    }, 480)
    return () => clearTimeout(t)
  }, [focusLandingSearchKey, landingSearchTopicHint])

  const scrollToSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCtaClick = (label) => {
    posthog.capture('cta_clicked', { label })
    scrollToSearch()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    onSearch({
      topic: topic.trim(),
      level: level.toLowerCase(),
      language: language.toLowerCase(),
      duration:
        duration.toLowerCase() === 'deep'
          ? 'medium'
          : duration.toLowerCase() === 'series'
            ? 'long'
            : 'short',
    })
  }

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] selection:bg-[#d8e2ff] selection:text-[#001a41]">
      {/* Landing nav */}
      <nav
        className={`fixed top-0 w-full z-50 bg-slate-50/85 backdrop-blur-xl transition-[box-shadow,background-color] duration-300 ease-out ${
          navScrolled ? 'shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12)] border-b border-slate-200/60' : 'shadow-sm'
        }`}
      >
        <div className="flex justify-between items-center px-6 md:px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-bold tracking-tighter text-slate-900" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
            Curator
          </div>
          <div className="hidden md:flex items-center gap-8 font-semibold tracking-tight" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
            <button type="button" onClick={scrollToSearch} className="text-blue-700 border-b-2 border-blue-700 pb-0.5">
              Discover
            </button>
            <ComingSoonHint>
              <span className="text-slate-600 cursor-default">Collections</span>
            </ComingSoonHint>
            <ComingSoonHint>
              <span className="text-slate-600 cursor-default">About</span>
            </ComingSoonHint>
          </div>
          <button
            type="button"
            onClick={() => handleCtaClick('Give it a try now - nav')}
            className="px-6 py-2.5 premium-gradient text-white font-semibold rounded-full hover:scale-105 transition-transform duration-300 text-sm md:text-base"
          >
            Give it a try now
          </button>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero */}
        <section className="px-6 md:px-8 pt-16 pb-24 max-w-screen-2xl mx-auto flex flex-col items-center text-center">
          <Reveal once className="inline-block mb-8" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e7e8e9] text-[#414754] text-sm font-medium">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              The Future of Video Learning
            </div>
          </Reveal>
          <Reveal once className="w-full flex justify-center" delay={70} variant="fade-up">
            <h1
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 text-[#191c1d] max-w-5xl leading-[1.08] flex flex-wrap items-center justify-center gap-x-2 md:gap-x-3 gap-y-1"
              style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
            >
              <span>Find the Best &nbsp;</span>
              <span className="inline-flex items-center gap-1.5 md:gap-2 text-[#FF0000]">
                <YouTubeMark className="size-10 sm:size-12 md:size-16 lg:size-[4.25rem] shrink-0" />
                <span>YouTube</span>
              </span>
              <span className="text-[#191c1d]">Video, Fast.</span>
            </h1>
          </Reveal>
          <Reveal once className="w-full max-w-2xl" delay={130}>
            <p className="text-lg md:text-2xl text-[#414754] mb-12 leading-relaxed">
              Tired of hunting for the right learning video and burning time on weak results? Curator helps you find the perfect lesson in one go—without wasting your valuable time or effort.
            </p>
          </Reveal>
          <Reveal once className="w-full flex justify-center mb-24" delay={190}>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => handleCtaClick('Give it a try now - hero')}
                className="h-14 px-10 premium-gradient text-white rounded-full font-bold text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                Give it a try now
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-14 px-10 bg-white text-primary border border-[#c1c6d6]/30 rounded-full font-bold text-lg hover:bg-[#f3f4f5] transition-all duration-300"
              >
                How it works
              </button>
            </div>
          </Reveal>

          {/* Hero mockup */}
          <Reveal once className="w-full max-w-5xl" variant="scale-in" delay={120}>
          <div className="w-full bg-[#f3f4f5] rounded-xl p-4 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-4 relative text-left">
              <div>
                <span className="text-sm font-bold text-primary-container tracking-widest uppercase mb-2 block">SEARCH RESULT</span>
                <h3 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                  &quot;Python Tutorial for Beginners&quot;
                </h3>
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="px-3 py-1 bg-[#e1e3e4] rounded-lg text-xs font-bold">TOP PICKS</div>
                <div className="px-3 py-1 bg-[#e1e3e4] rounded-lg text-xs font-bold">AI CURATED</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_CARDS.map((card, i) => (
                <Reveal once key={card.title} delay={80 + i * 100} variant="fade-up" className="h-full">
                <div
                  className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-500 border border-[#c1c6d6]/10 h-full"
                >
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      className="absolute inset-0 w-full h-full object-cover"
                      src={card.img}
                      alt=""
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/10 pointer-events-none group-hover:bg-black/0 transition-colors" />
                    {card.badge && (
                      <div className="absolute top-3 left-3 z-10 bg-primary text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">
                        {card.badge}
                      </div>
                    )}
                  </div>
                  <div className="p-5 text-left">
                    <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                      {card.title}
                    </h4>
                    <p className="text-sm text-[#414754] line-clamp-2 mb-4">{card.desc}</p>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <span
                        className="material-symbols-outlined text-sm"
                        style={card.iconFill ? { fontVariationSettings: '"FILL" 1' } : undefined}
                      >
                        {card.icon}
                      </span>
                      {card.why}
                    </div>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
          </Reveal>
        </section>

        {/* Search + filters */}
        <section id="curator-search" ref={searchRef} className="px-6 md:px-8 pb-20 max-w-3xl mx-auto scroll-mt-28">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#191c1d]" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
              Start your search
            </h2>
            <p className="text-[#414754] mt-2">What do you want to learn?</p>
          </Reveal>
          <Reveal variant="fade-up" delay={60}>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center bg-white rounded-full shadow-lg border border-slate-100 px-5 py-3 gap-3 hover:shadow-xl transition-shadow">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={topicInputRef}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Flexbox, Two sum LeetCode, French cooking…"
                className="min-w-0 flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-base"
              />
              {topic.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTopic('')
                    topicInputRef.current?.focus()
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 premium-gradient text-white font-semibold rounded-full hover:opacity-95 transition text-sm shrink-0"
              >
                Search
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Language</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {LANGUAGES.map((l) => (
                      <Chip key={l} label={l} selected={language === l} onClick={() => setLanguage(l)} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Level</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {LEVELS.map((l) => (
                      <Chip key={l} label={l} selected={level === l} onClick={() => setLevel(l)} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Duration</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {DURATIONS.map((d) => (
                    <Chip key={d} label={d} selected={duration === d} onClick={() => setDuration(d)} />
                  ))}
                </div>
              </div>
            </div>
          </form>
          </Reveal>
        </section>

        {/* Problem: noise vs signal — simple & crisp */}
        <section className="relative overflow-hidden bg-[#f8f9fa] py-20 md:py-28 px-6 md:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,91,191,0.08),transparent)]" />
          <div className="relative max-w-4xl mx-auto">
            <Reveal className="text-center mb-12 md:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary/90 mb-4">The difference</p>
              <h2
                className="text-[1.75rem] sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]"
                style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
              >
                Scroll less.
                <span className="text-primary"> Learn more.</span>
              </h2>
              <p className="mt-4 text-base md:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                Search is tuned for views and watch time. You need a lesson that fits —{' '}
                <span className="text-slate-800 font-medium">fast, clear, and in your language.</span>
              </p>
            </Reveal>

            <Reveal variant="scale-in" delay={80}>
              <NoiseSignalStrip />
            </Reveal>

            <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <Reveal variant="fade-left" delay={40}>
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-6 py-7 shadow-sm backdrop-blur-sm h-full transition-transform duration-300 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-5">
                  <YouTubeMark className="size-6 text-[#FF0000]" />
                  <span className="text-sm font-bold text-slate-800">Alone on YouTube</span>
                </div>
                <ul className="space-y-5">
                  {YT_PAIN_POINTS.map((row) => (
                    <li key={row.t} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-400/90" aria-hidden />
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900 leading-snug">{row.t}</p>
                        <p className="text-sm text-slate-500 mt-0.5 leading-snug">{row.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              </Reveal>

              <Reveal variant="fade-right" delay={40}>
              <div className="rounded-2xl border border-primary/20 bg-white px-6 py-7 shadow-lg shadow-primary/[0.07] ring-1 ring-primary/10 h-full transition-transform duration-300 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                    auto_awesome
                  </span>
                  <span className="text-sm font-bold text-slate-800">With Curator</span>
                </div>
                <ul className="space-y-5">
                  {CURATOR_WINS.map((row) => (
                    <li key={row.t} className="flex gap-3">
                      <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">check_circle</span>
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900 leading-snug">{row.t}</p>
                        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{row.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 md:py-32 px-6 md:px-8 max-w-screen-2xl mx-auto scroll-mt-24">
          <Reveal className="text-center mb-20 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#191c1d]" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
              How it Works
            </h2>
            <p className="text-[#414754] text-lg">Complex analysis, delivered in seconds.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              { icon: 'search', title: '1. Search a Topic', text: 'Enter anything from Flexbox to French cooking. Our engine understands intent, not just keywords.' },
              { icon: 'psychology', title: '2. AI Analysis', text: 'We score transcripts, comments, and metadata for clarity, popularity, and teaching quality.' },
              { icon: 'auto_awesome', title: '3. Get the Best', text: 'Receive curated videos with AI summaries and specific “Why this video” highlights.' },
            ].map((step, i) => (
              <Reveal key={step.title} delay={i * 100} variant="fade-up" className="text-center group">
                <div className="w-20 h-20 bg-[#edeeef] rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-primary-container group-hover:text-white transition-all duration-300 group-hover:scale-105">
                  <span className="material-symbols-outlined text-4xl">{step.icon}</span>
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                  {step.title}
                </h3>
                <p className="text-[#414754] leading-relaxed">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Editorial stacks */}
        <section className="py-24 md:py-32 px-6 md:px-8 overflow-hidden">
          <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <Reveal variant="fade-left" className="min-w-0">
              <span className="text-primary font-bold tracking-widest uppercase text-xs mb-4 block">LEVEL UP YOUR KNOWLEDGE</span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-8">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                  Editorial Stacks
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Coming soon</span>
              </div>
              <p className="text-xl text-[#414754] leading-relaxed mb-10">
                Don&apos;t just watch and forget. Save your top results into themed collections. Build your own curriculum for any skill, curated by intelligent ranking—not just views.
              </p>
              <ul className="space-y-6">
                {['Auto-organized by topic and difficulty level', 'Collaborative stacks for teams and classrooms'].map((item) => (
                  <li key={item} className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
                        check
                      </span>
                    </div>
                    <span className="text-lg font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal variant="fade-right" delay={80} className="relative min-w-0">
              <div className="absolute -inset-10 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  {COLLECTION_CARDS.slice(0, 2).map((c, i) => (
                    <Reveal key={c.t} delay={60 + i * 90} variant="fade-up" className="w-full">
                    <div
                      className="group relative aspect-[4/5] rounded-xl shadow-lg overflow-hidden border border-[#c1c6d6]/10 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <img
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={c.img}
                        alt=""
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                      <div className="relative z-10 h-full p-6 flex flex-col justify-end text-white">
                        <span className="text-xs font-bold text-white/80 mb-1 tracking-wide">COLLECTION</span>
                        <h4 className="text-xl font-extrabold drop-shadow-sm" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                          {c.t}
                        </h4>
                        <p className="text-xs text-white/85 mt-2">{c.n}</p>
                      </div>
                    </div>
                    </Reveal>
                  ))}
                </div>
                <div className="space-y-4">
                  {COLLECTION_CARDS.slice(2, 4).map((c, i) => (
                    <Reveal key={c.t} delay={120 + i * 90} variant="fade-up" className="w-full">
                    <div
                      className="group relative aspect-[4/5] rounded-xl shadow-lg overflow-hidden border border-[#c1c6d6]/10 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <img
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={c.img}
                        alt=""
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                      <div className="relative z-10 h-full p-6 flex flex-col justify-end text-white">
                        <span className="text-xs font-bold text-white/80 mb-1 tracking-wide">COLLECTION</span>
                        <h4 className="text-xl font-extrabold drop-shadow-sm" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                          {c.t}
                        </h4>
                        <p className="text-xs text-white/85 mt-2">{c.n}</p>
                      </div>
                    </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 px-6 md:px-8">
          <Reveal variant="scale-in" className="max-w-4xl mx-auto block">
            <div className="premium-gradient rounded-[2.5rem] p-12 md:p-20 lg:p-24 text-center text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <img
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCv3EhRoUsBGq33TG70nM-b5CSJnktkEGBSXU7QkdvLMuOUBCs7_tKTrEUREvcg6QigPihZIHxwaTFJg2t2jmXEeTp64Ky9gPARdk0Ry0JjGhIWZ4BXmH5hU9Y1fYUvTcP86vuqktQMHSfUB1Tsje5jJ6rX-Vqb8vIkHKB9REM0qb7dOhnlSTl5NREhAVsFUiLd5zT56gjaERQfNz_Y3uvLHWONSMbWlZNOuP1hlXsasYvef6wc-ZurkdvAsRKqRZMseRixZXAZPmA"
                  alt=""
                />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                  Ready to find your next breakthrough?
                </h2>
                <p className="text-lg md:text-xl opacity-90 mb-12 max-w-xl mx-auto">
                  Swap endless scrolling for a short list of videos that actually teach. Your next lesson is one search away.
                </p>
                <button
                  type="button"
                  onClick={() => handleCtaClick('Get Started - final cta')}
                  className="h-14 md:h-16 px-10 md:px-12 bg-white text-primary rounded-full font-bold text-lg md:text-xl hover:scale-105 transition-transform shadow-xl"
                >
                  Get Started
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 w-full py-12 px-6 md:px-8">
        <Reveal variant="fade" className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="text-lg font-bold text-slate-900" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                Curator
              </div>
              <p className="text-slate-500 text-sm" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                © {new Date().getFullYear()} Curator. An editorial video experience.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-slate-500">
              <ComingSoonHint>
                <span className="cursor-default hover:text-slate-700 transition-colors">Privacy Policy</span>
              </ComingSoonHint>
              <ComingSoonHint>
                <span className="cursor-default hover:text-slate-700 transition-colors">Terms of Service</span>
              </ComingSoonHint>
              <ComingSoonHint>
                <span className="cursor-default hover:text-slate-700 transition-colors">Twitter</span>
              </ComingSoonHint>
              <ComingSoonHint>
                <span className="cursor-default hover:text-slate-700 transition-colors">Contact Us</span>
              </ComingSoonHint>
            </div>
          </div>
        </Reveal>
      </footer>
    </div>
  )
}
