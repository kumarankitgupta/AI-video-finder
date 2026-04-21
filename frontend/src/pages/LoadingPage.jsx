import { Sparkles } from 'lucide-react'

const STEPS = [
  { label: 'Metadata indexed', threshold: 25 },
  { label: 'Quality scoring', threshold: 50 },
  { label: 'AI evaluation', threshold: 75 },
  { label: 'Generating summaries', threshold: 90 },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 flex gap-4">
      <div className="skeleton w-32 h-20 rounded-lg shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  )
}

export default function LoadingPage({ progress, stage }) {
  return (
    <main className="flex flex-col items-center justify-center px-4 pt-24 pb-16 min-h-[80vh]">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin-slow" />
        <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Finding the best videos for you...
      </h2>
      <p className="text-gray-500 mt-2 text-center">
        Analyzing content, clarity & relevance
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md mt-8">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-6 mt-6">
        {STEPS.map((step) => {
          const done = progress >= step.threshold
          const active = !done && progress >= step.threshold - 25
          return (
            <div key={step.label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  done
                    ? 'bg-primary'
                    : active
                    ? 'bg-primary/50 pulse-dot'
                    : 'bg-gray-300'
                }`}
              />
              <span
                className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                  done ? 'text-primary' : active ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-2xl mt-12 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Bottom status pill */}
      <div className="mt-8 px-4 py-2 bg-white rounded-full shadow border border-gray-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
        <span className="text-sm text-gray-600">
          Deep analysis in progress: {Math.round(progress)}%
        </span>
      </div>
    </main>
  )
}
