import { Link } from 'react-router-dom';

/**
 * Placeholder wordmark built from brand tokens. Swap for the client's
 * vector lockup (image 8 / image 10 per §3) once supplied — see §15.8.
 */
export function Logo({ full = false }: { full?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 font-kicker uppercase tracking-wide2">
      <span className="text-2xl">
        <span className="text-lf-white">L</span>
        <span className="text-lf-gold">F</span>
      </span>
      {full && (
        <span className="hidden text-sm text-lf-cream sm:inline-flex sm:items-center sm:gap-2">
          <span className="h-4 w-px bg-lf-gold/50" />
          Lean &amp; Fit <span className="text-lf-gold">/ Protein Coffee</span>
        </span>
      )}
    </Link>
  );
}
