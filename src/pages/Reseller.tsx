import { Container } from '../components/ui/Container';
import { SectionKicker } from '../components/ui/SectionKicker';
import { RESELLER } from '../content/site';

export default function Reseller() {
  return (
    <div className="bg-lf-black py-24 sm:py-32">
      <Container className="max-w-lg text-center">
        <SectionKicker>{RESELLER.kicker}</SectionKicker>
        <h1 className="text-4xl text-lf-white sm:text-5xl">{RESELLER.heading}</h1>
        <p className="mt-4 text-lf-cream/80">{RESELLER.intro}</p>

        <ul className="mt-10 space-y-3 text-left">
          {RESELLER.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 rounded-sm border border-white/10 bg-lf-charcoal px-5 py-4 text-sm text-lf-cream/90"
            >
              <span className="text-lf-gold">•</span>
              {benefit}
            </li>
          ))}
        </ul>

        <a href={`mailto:${RESELLER.contactEmail}`} className="btn-gold mt-10 inline-flex">
          Email Us To Get Started
        </a>
        <p className="mt-4 text-xs text-lf-cream/50">{RESELLER.contactEmail}</p>
      </Container>
    </div>
  );
}
