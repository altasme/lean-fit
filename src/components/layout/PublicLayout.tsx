import type { PropsWithChildren } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { StickyCTA } from './StickyCTA';

export function PublicLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <StickyCTA />
    </div>
  );
}
