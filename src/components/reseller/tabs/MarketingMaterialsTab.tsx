import { RESELLER } from '../../../content/site';

// Spec §45 "Marketing Materials" - initial implementation is just a link
// out to a Google Drive folder (admin-configurable, currently a content
// constant - see content/site.ts).
export function MarketingMaterialsTab() {
  return (
    <section className="rounded-sm border border-white/10 bg-lf-charcoal p-8 text-center">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
        Marketing Materials
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-lf-cream/70">
        Access official Lean &amp; Fit product photos, promotional materials, and approved marketing
        creatives.
      </p>
      <a
        href={RESELLER.marketingMaterialsUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-gold mt-6 inline-flex"
      >
        Open Marketing Materials
      </a>
    </section>
  );
}
