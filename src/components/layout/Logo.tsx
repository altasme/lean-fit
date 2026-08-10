import { Link } from 'react-router-dom';
import monogram from '../../assets/logo-monogram.svg';
import lockup from '../../assets/logo-lockup.svg';

export function Logo({ full = false }: { full?: boolean }) {
  return (
    <Link to="/" className="flex items-center">
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
