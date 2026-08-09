import { OrderNowButton } from '../ui/OrderNowButton';
import { Container } from '../ui/Container';
import { TAGLINE } from '../../content/product';

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-lf-black py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.16), transparent 60%)',
        }}
      />
      <Container className="relative flex flex-col items-center text-center">
        <p className="kicker">Lean &amp; Fit Protein Coffee</p>
        <h1 className="max-w-3xl text-5xl leading-[0.95] text-lf-white sm:text-7xl">
          {TAGLINE.hero}
        </h1>
        <p className="mt-6 max-w-md font-body text-base text-lf-cream/80 sm:text-lg">
          High protein. Low sugar. Made for an active lifestyle.
        </p>
        <OrderNowButton className="mt-10" />
      </Container>
    </section>
  );
}
