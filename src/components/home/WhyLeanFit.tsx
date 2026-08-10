import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { OrderNowButton } from '../ui/OrderNowButton';
import { COMPARISON } from '../../content/site';

export function WhyLeanFit() {
  return (
    <section id="why" className="scroll-mt-16 bg-lf-charcoal py-20 sm:scroll-mt-20 sm:py-28">
      <Container className="text-center">
        <SectionKicker>Why Lean &amp; Fit</SectionKicker>
        <h2 className="mx-auto max-w-2xl text-4xl text-lf-white sm:text-5xl">
          One Coffee. More Purpose.
        </h2>

        <div className="mx-auto mt-14 grid max-w-2xl gap-6 sm:grid-cols-2">
          <div className="rounded-sm border border-white/10 bg-lf-black/40 p-8 text-left">
            <h3 className="font-kicker text-lg uppercase tracking-wide2 text-lf-cream/60">
              {COMPARISON.traditional.title}
            </h3>
            <ul className="mt-5 space-y-3">
              {COMPARISON.traditional.points.map((p) => (
                <li key={p} className="text-lf-cream/60">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-sm border border-lf-gold bg-lf-black p-8 text-left shadow-gold-glow">
            <h3 className="font-kicker text-lg uppercase tracking-wide2 text-lf-gold">
              {COMPARISON.leanFit.title}
            </h3>
            <ul className="mt-5 space-y-3">
              {COMPARISON.leanFit.points.map((p) => (
                <li key={p} className="text-lf-white">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <OrderNowButton className="mt-14" />
      </Container>
    </section>
  );
}
