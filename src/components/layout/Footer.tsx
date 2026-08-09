import { Container } from '../ui/Container';
import { Logo } from './Logo';
import { SITE } from '../../content/site';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-lf-black py-12">
      <Container className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <p className="max-w-md text-sm text-lf-cream/70">
          We don&apos;t just make coffee. We fuel your discipline and power your transformation.
        </p>
        <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">{SITE.social}</p>
        <p className="text-xs text-lf-cream/40">
          &copy; {new Date().getFullYear()} {SITE.fullName}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
