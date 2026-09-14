import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { OrderNowButton } from '../ui/OrderNowButton';
import { Reveal } from '../ui/Reveal';
import { COMPARISON } from '../../content/site';

export function WhyLeanFit() {
  return (
    <section id="why" className="scroll-mt-16 bg-lf-charcoal py-20 sm:scroll-mt-20 sm:py-28">
      <Container className="text-center">
        <Reveal>
          <SectionKicker>Why Lean &amp; Fit</SectionKicker>
          <h2 className="mx-auto max-w-2xl text-4xl text-lf-white sm:text-5xl">
            One Coffee. More Purpose.
          </h2>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-2xl gap-6 sm:grid-cols-2">
          <Reveal className="rounded-sm border border-white/10 bg-lf-black/40 p-8 text-left" delay={100}>
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
          </Reveal>
          <Reveal
            className="rounded-sm border border-lf-gold bg-lf-black p-8 text-left shadow-gold-glow"
            delay={220}
          >
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
          </Reveal>
        </div>

        <OrderNowButton className="mt-14" />
      </Container>
    </section>
  );
}
