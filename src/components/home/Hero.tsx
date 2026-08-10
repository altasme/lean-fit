import { OrderNowButton } from '../ui/OrderNowButton';
import { Container } from '../ui/Container';
import { TAGLINE } from '../../content/product';
import heroDesktop from '../../assets/hero-bg.jpg';
import heroMobile from '../../assets/hero-bg-mobile.jpg';

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-lf-black py-24 sm:py-32">
      <picture>
        <source media="(max-width: 639px)" srcSet={heroMobile} />
        <img
          src={heroDesktop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </picture>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.35) 40%, rgba(13,13,13,0.85) 100%)',
        }}
      />
      <Container className="relative flex flex-col items-center text-center">
        <p className="kicker">Lean &amp; Fit Protein Coffee</p>
        <h1 className="max-w-3xl text-5xl leading-[0.95] text-lf-white sm:text-7xl [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
          {TAGLINE.hero}
        </h1>
        <p className="mt-6 max-w-md font-body text-base text-lf-cream/90 sm:text-lg [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
          High protein. Low sugar. Made for an active lifestyle.
        </p>
        <OrderNowButton className="mt-10" />
      </Container>
    </section>
  );
}
