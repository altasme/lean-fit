import { OrderNowButton } from '../ui/OrderNowButton';
import { Container } from '../ui/Container';
import { TAGLINE } from '../../content/product';
import heroDesktop from '../../assets/hero-bg.jpg';
import heroMobile from '../../assets/hero-bg-mobile.jpg';

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-lf-black">
      <Container className="relative flex flex-col items-center pb-14 pt-20 text-center sm:pb-20 sm:pt-28">
        <p className="kicker">Lean &amp; Fit Protein Coffee</p>
        <h1 className="max-w-3xl text-5xl leading-[0.95] text-lf-white sm:text-7xl">
          {TAGLINE.hero}
        </h1>
        <p className="mt-6 max-w-md font-body text-base text-lf-cream/90 sm:text-lg">
          High protein. Low sugar. Made for an active lifestyle.
        </p>
        <OrderNowButton className="mt-10" />
      </Container>

      <div className="relative h-[360px] w-full overflow-hidden sm:h-[480px] lg:h-[560px]">
        <picture>
          <source media="(max-width: 639px)" srcSet={heroMobile} />
          <img
            src={heroDesktop}
            alt="Fit man and woman, back to back, ready to train"
            className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
          />
        </picture>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(13,13,13,0.9) 0%, transparent 18%, transparent 78%, rgba(13,13,13,0.95) 100%)',
          }}
        />
      </div>
    </section>
  );
}
