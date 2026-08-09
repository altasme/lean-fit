export function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-lf-gold/40 bg-lf-charcoal px-4 py-1.5 text-xs font-body font-medium uppercase tracking-wide2 text-lf-cream">
      {children}
    </span>
  );
}
