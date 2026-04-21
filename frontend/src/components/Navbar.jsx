import { Search, Bell, Settings, User, Sparkles } from 'lucide-react'
import ComingSoonHint from './ComingSoonHint'

export default function Navbar({ query, showNav, onBack, onGoToLandingSearch }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 hover:opacity-80 transition shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">Curator</span>
        </button>

        {showNav && (
          <button
            type="button"
            onClick={onGoToLandingSearch}
            className="flex min-w-0 flex-1 max-w-[min(100%,20rem)] items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 transition-colors mx-2"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 px-2 truncate text-left">
              {query?.topic || 'New search'}
            </span>
          </button>
        )}

        {showNav && (
          <nav className="hidden min-[500px]:flex items-center gap-6 text-sm font-medium text-gray-500 shrink-0">
            <span className="text-primary border-b-2 border-primary pb-0.5">Discover</span>
            <ComingSoonHint>
              <span className="cursor-default hover:text-gray-700">Library</span>
            </ComingSoonHint>
            <ComingSoonHint>
              <span className="cursor-default hover:text-gray-700">Collections</span>
            </ComingSoonHint>
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <ComingSoonHint>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
          </ComingSoonHint>
          <ComingSoonHint>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </ComingSoonHint>
          <ComingSoonHint>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary-dark transition"
              aria-label="Account"
            >
              <User className="w-4 h-4 text-white" />
            </button>
          </ComingSoonHint>
        </div>
      </div>
    </header>
  )
}
