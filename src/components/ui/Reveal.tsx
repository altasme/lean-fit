import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-triggered fade-up entrance, used throughout the homepage for a
 * premium "wow" first-scroll feel (client request). Fires once - an
 * element that's already appeared stays visible scrolling back up,
 * rather than hiding/re-animating - and does nothing at all under
 * `prefers-reduced-motion` (renders fully visible immediately).
 *
 * A plain `<div>` wrapper (not a generic `as` prop) - pass grid-item
 * classes straight through `className` so it slots into an existing
 * grid exactly like the element it replaced.
 */
export function Reveal({
  className = '',
  delay = 0,
  children,
}: PropsWithChildren<{ className?: string; delay?: number }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
