import { Container } from '../ui/Container';
import { OrderNowButton } from '../ui/OrderNowButton';
import { TAGLINE } from '../../content/product';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-lf-charcoal py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.14), transparent 65%)',
        }}
      />
      <Container className="relative text-center">
        <h2 className="mx-auto max-w-3xl text-4xl leading-[0.95] text-lf-white sm:text-6xl">
          {TAGLINE.primary}
        </h2>
        <p className="mx-auto mt-6 max-w-md text-lf-cream/80">{TAGLINE.supporting}</p>
        <OrderNowButton className="mt-10">Buy Lean &amp; Fit</OrderNowButton>
      </Container>
    </section>
  );
}
