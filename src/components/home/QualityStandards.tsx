import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { Reveal } from '../ui/Reveal';
import { QUALITY } from '../../content/site';

/**
 * Generic line-icon badges (gold, matches CLAUDE.md §5.4's icon style) -
 * NOT the actual FDA/Halal certifying-body marks. Those are real
 * third-party marks the client must supply as image assets; swap these
 * placeholders for them once received, same convention as the GCash/Maya
 * QR placeholders in content/payment.ts.
 */
function ShieldCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 4 8 10v11c0 11 6.8 18.9 16 23 9.2-4.1 16-12 16-23V10L24 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16.5 24l5 5.5L32 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Simplified Philippine flag - a real vector rather than the 🇵🇭 emoji,
 * which is a two-codepoint "flag" glyph many OS/browser font stacks don't
 * render at all (unlike plain pictographs like 🔬/☕), leaving a blank gap
 * in the tagline row (client-reported).
 */
function PhFlagIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={className} aria-hidden="true" focusable="false">
      <rect width="20" height="7" fill="#0038A8" />
      <rect y="7" width="20" height="7" fill="#CE1126" />
      <polygon points="0,0 0,14 12,7" fill="#FFFFFF" />
      <circle cx="5" cy="7" r="1.6" fill="#FCD116" />
    </svg>
  );
}

function CertificateIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="18" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M18.5 28l-3.5 14 9-5 9 5-3.5-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18.5 18.5l3.8 4 7.2-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CERT_ICONS = [ShieldCheckIcon, CertificateIcon];

export function QualityStandards() {
  return (
    <section className="bg-lf-charcoal py-20 sm:py-28">
      <Container className="max-w-3xl text-center">
        <Reveal>
          <SectionKicker>{QUALITY.kicker}</SectionKicker>
          <h2 className="text-4xl text-lf-white sm:text-5xl">{QUALITY.heading}</h2>
          <p className="mt-4 text-lg text-lf-gold">{QUALITY.subheading}</p>
          <p className="mx-auto mt-4 max-w-xl text-lf-cream/80">{QUALITY.intro}</p>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            {QUALITY.standardsLabel}
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {QUALITY.certifications.map((c, i) => {
              const Icon = CERT_ICONS[i % CERT_ICONS.length];
              return (
                <div
                  key={c.title}
                  className="flex items-center gap-4 rounded-sm border border-white/10 bg-lf-black/40 p-6 text-left"
                >
                  <Icon className="h-11 w-11 shrink-0 text-lf-gold" />
                  <div>
                    <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">{c.title}</p>
                    <p className="mt-1 text-xs text-lf-cream/60">{c.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <a
            href={QUALITY.verifyUrl}
            className="mt-8 inline-flex items-center gap-2 font-kicker text-sm uppercase tracking-wide2 text-lf-gold transition-colors hover:text-lf-cream"
          >
            Verify Certifications <span aria-hidden="true">→</span>
          </a>
        </Reveal>

        <Reveal
          delay={220}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm text-lf-cream/70"
        >
          {QUALITY.tagline.map((t, i) => (
            <span key={t.label} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="mx-1 text-lf-cream/30">·</span>}
              {t.icon === 'flag-ph' ? (
                <PhFlagIcon className="h-3.5 w-5 shrink-0 rounded-[1px]" />
              ) : (
                <span aria-hidden="true">{t.icon}</span>
              )}
              {t.label}
            </span>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
