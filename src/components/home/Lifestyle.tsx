import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { Reveal } from '../ui/Reveal';
import { LIFESTYLE_MOMENTS } from '../../content/site';
import morning from '../../assets/lifestyle/morning.jpg';
import preWorkout from '../../assets/lifestyle/pre-workout.jpg';
import midday from '../../assets/lifestyle/midday.jpg';
import onTheGo from '../../assets/lifestyle/on-the-go.jpg';

const MOMENT_IMAGES: Record<string, string> = {
  Morning: morning,
  'Pre-Workout': preWorkout,
  Midday: midday,
  'On the Go': onTheGo,
};

export function Lifestyle() {
  return (
    <section className="relative overflow-hidden bg-lf-black py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(107,78,49,0.15), transparent 60%)' }}
      />
      <Container className="relative text-center">
        <Reveal>
          <SectionKicker>Lifestyle</SectionKicker>
          <h2 className="mx-auto max-w-2xl text-4xl leading-tight text-lf-white sm:text-6xl">
            Train. Work. Move. Repeat.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LIFESTYLE_MOMENTS.map((m, i) => (
            <Reveal
              key={m.label}
              className="group relative aspect-[4/5] overflow-hidden rounded-sm border border-white/10"
              delay={i * 100}
            >
              <img
                src={MOMENT_IMAGES[m.label]}
                alt={m.label}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, transparent 40%, rgba(13,13,13,0.92) 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                  {m.label}
                </p>
                <p className="mt-1 text-sm text-lf-cream/90">{m.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
