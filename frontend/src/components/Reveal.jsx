import { useInView } from '../hooks/useInView'

const variants = {
  'fade-up': 'reveal-fade-up',
  fade: 'reveal-fade',
  'scale-in': 'reveal-scale-in',
  'fade-left': 'reveal-fade-left',
  'fade-right': 'reveal-fade-right',
}

/**
 * Scroll-triggered reveal. Respects prefers-reduced-motion via CSS.
 * By default animates every time the block enters the viewport (scroll up or down).
 * Pass `once` for sections that should stay visible after the first reveal (e.g. hero).
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'fade-up',
  as: Tag = 'div',
  once = false,
  threshold,
  rootMargin,
}) {
  const { ref, isInView } = useInView({
    once,
    threshold: threshold ?? 0.08,
    rootMargin: rootMargin ?? '0px 0px -10% 0px',
  })

  const v = variants[variant] || variants['fade-up']

  return (
    <Tag
      ref={ref}
      className={`${v} ${isInView ? 'reveal-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
