import { Container } from '../ui/Container';
import { LEGAL_LAST_UPDATED } from '../../content/legal';
import type { LegalPage } from '../../content/legal';

/** Shared renderer for the Privacy/Refund/Shipping policy pages - same layout, different content. */
export function LegalPageLayout({ page }: { page: LegalPage }) {
  return (
    <div className="bg-lf-black py-16 sm:py-24">
      <Container className="max-w-3xl">
        <h1 className="text-4xl text-lf-white sm:text-5xl">{page.title}</h1>
        <p className="mt-2 text-xs uppercase tracking-wide2 text-lf-cream/40">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        <p className="mt-6 text-sm text-lf-cream/80">{page.intro}</p>

        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-lf-cream/75">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </div>
  );
}
