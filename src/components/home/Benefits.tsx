import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { BENEFITS } from '../../content/site';

export function Benefits() {
  return (
    <section className="bg-lf-black py-20 sm:py-28">
      <Container>
        <div className="text-center">
          <SectionKicker>Benefits</SectionKicker>
          <h2 className="mx-auto max-w-xl text-4xl text-lf-white sm:text-5xl">
            Built For The Grind
          </h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="text-center sm:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-lf-gold text-lf-gold sm:mx-0">
                <span className="font-kicker text-xl">+</span>
              </div>
              <h3 className="font-kicker text-base uppercase tracking-wide2 text-lf-white">
                {b.title}
              </h3>
              <p className="mt-2 text-sm text-lf-cream/70">{b.blurb}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
