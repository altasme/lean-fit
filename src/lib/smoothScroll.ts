/**
 * Custom eased scroll animation for nav/logo clicks. Native
 * `scrollIntoView({behavior:'smooth'})` / CSS `scroll-behavior:smooth`
 * varies in speed by browser and distance (often quite fast over a short
 * distance) - this animates over a fixed duration with an ease-in-out
 * curve instead, for a deliberately unhurried, consistent feel.
 *
 * Only used for same-page navigation (already on "/", clicking the logo
 * or a section link) - see Logo.tsx/Nav.tsx. Cross-page navigation still
 * goes through react-router + ScrollToTop.tsx, which lands instantly on
 * purpose (animating from the OLD page's scroll position while the DOM
 * swaps to entirely different content would look broken, not smooth).
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function animateScrollTo(targetY: number, duration: number): void {
  if (prefersReducedMotion()) {
    // 'instant', not 'auto' - 'auto' defers to the page's CSS
    // scroll-behavior (smooth), which would animate anyway.
    window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    // `behavior: 'instant'` is required here, not cosmetic - the site sets
    // global CSS `scroll-behavior: smooth` (index.css), which the 2-arg
    // `scrollTo(x, y)` form inherits. Without overriding it per-call, each
    // of these rapid per-frame scrollTo calls kicks off its OWN native
    // smooth-scroll animation on top of this one, and the two fight -
    // same reasoning ScrollToTop.tsx already documents.
    window.scrollTo({ top: startY + distance * easeInOutQuad(t), left: 0, behavior: 'instant' });
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export function smoothScrollToTop(duration = 900): void {
  animateScrollTo(0, duration);
}

/** Scrolls to an element by id, respecting its CSS `scroll-margin-top` (the sticky header offset every section already sets). */
export function smoothScrollToElement(id: string, duration = 900): void {
  const el = document.getElementById(id);
  if (!el) return;

  const scrollMarginTop = parseFloat(getComputedStyle(el).scrollMarginTop || '0');
  const targetY = el.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
  animateScrollTo(Math.max(0, targetY), duration);
}
