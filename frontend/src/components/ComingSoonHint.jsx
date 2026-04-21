/** Hover tooltip for features not available during pilot */
export default function ComingSoonHint({ children, className = '' }) {
  return (
    <span className={`group relative inline-flex items-center ${className}`.trim()}>
      {children}
      <span
        className="pointer-events-none absolute left-1/2 top-full z-[60] mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
        role="tooltip"
      >
        Coming soon
      </span>
    </span>
  )
}
