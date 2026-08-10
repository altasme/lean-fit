import { OrderNowButton } from '../ui/OrderNowButton';
import { Container } from '../ui/Container';
import { TAGLINE } from '../../content/product';
import heroWide from '../../assets/hero-bg-wide.jpg';
import heroMobile from '../../assets/hero-bg-mobile.jpg';

function HeroCopy({ align = 'center' }: { align?: 'center' | 'left' }) {
  const alignClasses = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  return (
    <div className={`relative flex flex-col ${alignClasses}`}>
      <p className="kicker">Lean &amp; Fit Protein Coffee</p>
      <h1 className="max-w-xl text-5xl leading-[0.95] text-lf-white sm:text-6xl lg:text-7xl [text-shadow:0_2px_20px_rgba(0,0,0,0.7)]">
        {TAGLINE.hero}
      </h1>
      <p className="mt-6 max-w-md font-body text-base text-lf-cream/90 sm:text-lg [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">
        High protein. Low sugar. Made for an active lifestyle.
      </p>
      <OrderNowButton className="mt-10" />
    </div>
  );
}

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-lf-black">
      {/* Desktop / tablet: full-bleed wide shot, subjects on the right, text
          sits in the image's own empty left third — no overlap by construction. */}
      <div className="relative hidden min-h-[620px] items-center sm:flex lg:min-h-[760px]">
        <img
          src={heroWide}
          alt="Fit man and woman, back to back, ready to train"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.72) 32%, rgba(13,13,13,0.25) 52%, transparent 68%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(13,13,13,0.5) 0%, transparent 25%, rgba(13,13,13,0.6) 100%)',
          }}
        />
        <Container>
          <HeroCopy align="left" />
        </Container>
      </div>

      {/* Mobile: stacked layout — solid text band on top, tall photo band
          below cropped to show the full physique (not just faces). */}
      <div className="sm:hidden">
        <Container className="pb-10 pt-20">
          <HeroCopy align="center" />
        </Container>
        <div className="relative h-[520px] w-full overflow-hidden">
          <img
            src={heroMobile}
            alt="Fit man and woman, back to back, ready to train"
            className="absolute inset-0 h-full w-full object-cover object-[50%_38%]"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(13,13,13,0.85) 0%, transparent 16%, transparent 82%, rgba(13,13,13,0.95) 100%)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
