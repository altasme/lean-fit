import { useEffect, useState } from 'react';
import { OrderNowButton } from '../ui/OrderNowButton';

/**
 * Sticky mobile CTA bar - appears once the #hero section has scrolled out
 * of view. Desktop already shows the nav's Order Now button, so this stays
 * mobile-only.
 */
export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t border-lf-gold/30 bg-lf-black/95 px-4 py-3 backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!visible}
    >
      <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">Lean &amp; Fit</span>
      <OrderNowButton className="!px-6 !py-2.5 !text-sm" />
    </div>
  );
}
