import { Container } from '../ui/Container';
import { Logo } from './Logo';
import { OrderNowButton } from '../ui/OrderNowButton';
import { NAV_LINKS } from '../../content/site';

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-lf-black/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Logo full />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream transition-colors hover:text-lf-gold"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <OrderNowButton className="!px-5 !py-2.5 !text-sm" />
      </Container>
    </header>
  );
}
