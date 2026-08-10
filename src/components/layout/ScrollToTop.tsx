import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router doesn't reset scroll position on navigation (unlike a
 * traditional multi-page site), so without this, clicking "Order Now"
 * from partway down the homepage lands on /checkout at the same scroll
 * offset instead of the top of the new page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // The site's global `scroll-behavior: smooth` (for in-page anchor links
    // like nav -> #faq) also applies to plain scrollTo(x, y) / scrollTop
    // assignment, so a route change ends up animating over ~1s instead of
    // jumping — it should be instant, or it looks like the page loaded at
    // the bottom and scrolled itself up. `behavior: 'instant'` explicitly
    // overrides the CSS property rather than deferring to it.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
