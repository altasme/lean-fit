import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { Reveal } from '../ui/Reveal';
import { SocialLinks } from '../layout/SocialLinks';
import { SITE, TESTIMONIALS } from '../../content/site';

/**
 * ⛔ Testimonial quotes/names are placeholders - see the note in
 * content/site.ts. Swap for real, attributed customer reviews before
 * launch. No fabricated review counts/star ratings per §5.8.
 */
export function SocialProof() {
  return (
    <section className="bg-lf-charcoal py-20 sm:py-28">
      <Container>
        <Reveal className="text-center">
          <SectionKicker>Testimonials</SectionKicker>
          <h2 className="mx-auto max-w-xl text-4xl text-lf-white sm:text-5xl">
            What Our Customers Say
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal
              key={t.name}
              className="flex flex-col rounded-sm border border-white/10 bg-lf-black/40 p-6 text-left"
              delay={i * 120}
            >
              <figure className="flex flex-1 flex-col">
                <blockquote className="flex-1 text-lf-cream/90">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-5">
                  <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                    {t.name}
                  </p>
                  <p className="mt-0.5 text-xs text-lf-cream/50">{t.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-14 max-w-md text-center text-lf-cream/75">
          Follow {SITE.social} for real training days, real routines, and real Lean &amp; Fit
          moments from the community.
        </p>
        <SocialLinks className="mt-4 justify-center" />
      </Container>
    </section>
  );
}
