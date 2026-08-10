import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router doesn't reset scroll position on navigation (unlike a
 * traditional multi-page site), so without this, clicking "Order Now"
 * from partway down the homepage lands on /checkout at the same scroll
 * offset instead of the top of the new page.
 *
 * It's also hash-aware: nav links clicked from a page other than home
 * (e.g. /checkout -> Product) navigate to `/#product` - this scrolls to
 * that section once Home has mounted, instead of just landing on top.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // `behavior: 'instant'` explicitly overrides the site's global
    // `scroll-behavior: smooth` (for in-page anchor links like nav ->
    // #faq while already on home) - without it, plain scrollTo()/
    // scrollIntoView() inherit the smooth CSS and animate over ~1s,
    // making the page look like it loaded at the bottom/elsewhere and
    // scrolled itself into place.
    const behavior = 'instant' as ScrollBehavior;

    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior, block: 'start' });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior });
  }, [pathname, hash]);

  return null;
}
