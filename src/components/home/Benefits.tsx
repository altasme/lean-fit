import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { BENEFITS } from '../../content/site';
import iconFuelsDiscipline from '../../assets/icons/fuels-discipline.svg';
import iconLowSugar from '../../assets/icons/low-sugar-high-purpose.svg';
import iconSupportsRecovery from '../../assets/icons/supports-recovery.svg';
import iconGrabAndGo from '../../assets/icons/grab-and-go.svg';
import iconGlutenFree from '../../assets/icons/gluten-free-keto-friendly.svg';
import sectionBg from '../../assets/backgrounds/benefits-bg.jpg';

const BENEFIT_ICONS: Record<string, string> = {
  'Fuels Discipline': iconFuelsDiscipline,
  'Low Sugar, High Purpose': iconLowSugar,
  'Supports Recovery': iconSupportsRecovery,
  'Grab & Go': iconGrabAndGo,
  'Gluten Free & Keto Friendly': iconGlutenFree,
};

export function Benefits() {
  return (
    <section className="relative overflow-hidden bg-lf-black py-20 sm:py-28">
      <img
        src={sectionBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-lf-black/55" />
      <Container className="relative">
        <div className="text-center">
          <SectionKicker>Benefits</SectionKicker>
          <h2 className="mx-auto max-w-xl text-4xl text-lf-white sm:text-5xl">
            Built For The Grind
          </h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="text-center sm:text-left">
              <img
                src={BENEFIT_ICONS[b.title]}
                alt=""
                className="mx-auto mb-4 h-16 w-16 sm:mx-0"
              />
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
