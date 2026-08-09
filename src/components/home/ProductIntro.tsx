import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { OrderNowButton } from '../ui/OrderNowButton';
import { PRODUCT } from '../../content/product';
import { useInView } from '../../hooks/useInView';
import { useEffect } from 'react';
import { trackViewContent } from '../../lib/pixel';

const metrics = [
  { label: 'Protein', value: PRODUCT.metrics.protein },
  { label: 'Cal', value: PRODUCT.metrics.calories },
  { label: 'Sugar', value: PRODUCT.metrics.sugar },
  { label: 'Per Sachet', value: `${PRODUCT.sachetGrams}g` },
];

export function ProductIntro() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });

  useEffect(() => {
    if (inView) trackViewContent(PRODUCT.price);
  }, [inView]);

  return (
    <section id="product" className="bg-lf-black py-20 sm:py-28">
      <Container ref={ref} className="grid items-center gap-12 md:grid-cols-2">
        <div
          className="mx-auto aspect-square w-full max-w-sm rounded-sm border border-lf-gold/20"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(212,175,55,0.18), rgba(13,13,13,0.9) 70%)',
          }}
          role="img"
          aria-label={`${PRODUCT.name} product shot placeholder`}
        />
        <div>
          <SectionKicker>{PRODUCT.variant}</SectionKicker>
          <h2 className="text-4xl text-lf-white sm:text-5xl">{PRODUCT.name}</h2>
          <p className="mt-4 max-w-md text-lf-cream/80">
            A functional coffee built for people who train, work, and move hard — protein,
            focus, and flavor in every sachet.
          </p>
          <dl className="tabular mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label}>
                <dt className="kicker !text-xs">{m.label}</dt>
                <dd className="mt-1 font-display text-2xl text-lf-white">{m.value}</dd>
              </div>
            ))}
          </dl>
          <OrderNowButton className="mt-10" />
        </div>
      </Container>
    </section>
  );
}
