import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { SITE } from '../../content/site';

/**
 * ⚠️ No fabricated review counts or testimonials per §5.8 — this section
 * stays minimal until the client supplies real reviews / UGC (see §15.8).
 */
export function SocialProof() {
  return (
    <section className="bg-lf-charcoal py-20 sm:py-28">
      <Container className="text-center">
        <SectionKicker>Community</SectionKicker>
        <h2 className="mx-auto max-w-xl text-4xl text-lf-white sm:text-5xl">
          Join The Movement
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lf-cream/75">
          Follow {SITE.social} for real training days, real routines, and real Lean &amp; Fit
          moments from the community.
        </p>
      </Container>
    </section>
  );
}
