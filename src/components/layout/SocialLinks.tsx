import { PRODUCT } from '../../content/product';

const ICON_CLASS = 'h-5 w-5 fill-current';

const PLATFORMS = [
  {
    name: 'Facebook',
    href: PRODUCT.social.links.facebook,
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden="true">
        <path d="M13.5 21v-8.1h2.72l.4-3.16h-3.12V7.75c0-.92.25-1.54 1.57-1.54h1.67V3.4A22.5 22.5 0 0 0 14.3 3.2c-2.4 0-4.05 1.47-4.05 4.16v2.38H7.5v3.16h2.75V21h3.25Z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: PRODUCT.social.links.instagram,
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden="true">
        <path d="M12 2.2c2.7 0 3 0 4.1.06 1.1.05 1.8.22 2.4.46.6.24 1.1.56 1.6 1.06.5.5.82 1 1.06 1.6.24.6.4 1.3.46 2.4.05 1.1.06 1.4.06 4.1s0 3-.06 4.1c-.05 1.1-.22 1.8-.46 2.4a4.4 4.4 0 0 1-1.06 1.6c-.5.5-1 .82-1.6 1.06-.6.24-1.3.4-2.4.46-1.1.05-1.4.06-4.1.06s-3 0-4.1-.06c-1.1-.05-1.8-.22-2.4-.46a4.4 4.4 0 0 1-1.6-1.06 4.4 4.4 0 0 1-1.06-1.6c-.24-.6-.4-1.3-.46-2.4C2.2 15 2.2 14.7 2.2 12s0-3 .06-4.1c.05-1.1.22-1.8.46-2.4.24-.6.56-1.1 1.06-1.6a4.4 4.4 0 0 1 1.6-1.06c.6-.24 1.3-.4 2.4-.46C8.9 2.2 9.3 2.2 12 2.2Zm0 1.8c-2.66 0-2.97 0-4.02.06-.9.04-1.4.19-1.72.32-.43.17-.74.37-1.07.7-.33.33-.53.64-.7 1.07-.13.32-.28.82-.32 1.72C4.1 9.03 4.1 9.34 4.1 12c0 2.66 0 2.97.06 4.02.04.9.19 1.4.32 1.72.17.43.37.74.7 1.07.33.33.64.53 1.07.7.32.13.82.28 1.72.32 1.05.05 1.36.06 4.02.06s2.97 0 4.02-.06c.9-.04 1.4-.19 1.72-.32.43-.17.74-.37 1.07-.7.33-.33.53-.64.7-1.07.13-.32.28-.82.32-1.72.05-1.05.06-1.36.06-4.02s0-2.97-.06-4.02c-.04-.9-.19-1.4-.32-1.72a2.9 2.9 0 0 0-.7-1.07 2.9 2.9 0 0 0-1.07-.7c-.32-.13-.82-.28-1.72-.32C14.97 4 14.66 4 12 4Zm0 3.05a4.95 4.95 0 1 1 0 9.9 4.95 4.95 0 0 1 0-9.9Zm0 1.8a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Zm5.15-1.98a1.16 1.16 0 1 1-2.31 0 1.16 1.16 0 0 1 2.31 0Z" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: PRODUCT.social.links.tiktok,
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden="true">
        <path d="M16.6 2h-3.2v13.4a2.8 2.8 0 1 1-2-2.68V9.4a6 6 0 1 0 5.2 5.94V8.9a7.6 7.6 0 0 0 4.4 1.4V7.1a4.4 4.4 0 0 1-4.4-4.4V2Z" />
      </svg>
    ),
  },
];

export function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {PLATFORMS.map((p) => (
        <a
          key={p.name}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Lean & Fit on ${p.name}`}
          className="text-lf-cream/60 transition-colors hover:text-lf-gold"
        >
          {p.icon}
        </a>
      ))}
    </div>
  );
}
