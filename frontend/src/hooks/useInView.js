import { useEffect, useState, useRef } from 'react'

/**
 * Sets isInView when the element intersects the viewport.
 * @param {{ once?: boolean; threshold?: number; rootMargin?: string }} opts
 */
export function useInView(opts = {}) {
  const { once = false, threshold = 0.1, rootMargin = '0px 0px -12% 0px' } = opts
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setIsInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once, threshold, rootMargin])

  return { ref, isInView }
}
