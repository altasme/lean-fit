import { Link, useLocation } from 'react-router-dom';
import monogram from '../../assets/logo-monogram.svg';
import lockup from '../../assets/logo-lockup.svg';
import { smoothScrollToTop } from '../../lib/smoothScroll';

export function Logo({ full = false }: { full?: boolean }) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  // Already on the homepage (e.g. scrolled down to the footer) - scroll
  // there smoothly instead of a no-op react-router navigation to the
  // same route (which wouldn't scroll at all - pathname/hash are
  // unchanged, so there's nothing for a route change to react to).
  function handleClick(e: React.MouseEvent) {
    if (isHome) {
      e.preventDefault();
      smoothScrollToTop();
    }
  }

  return (
    <Link to="/" onClick={handleClick} className="flex items-center">
      {full ? (
        <>
          <img src={monogram} alt="Lean & Fit" className="h-8 w-8 sm:hidden" />
          <img src={lockup} alt="Lean & Fit Protein Coffee" className="hidden h-11 sm:block lg:h-12" />
        </>
      ) : (
        <img src={monogram} alt="Lean & Fit" className="h-8 w-8" />
      )}
    </Link>
  );
}
