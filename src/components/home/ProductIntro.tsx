import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { OrderNowButton } from '../ui/OrderNowButton';
import { PRODUCT } from '../../content/product';
import { useInView } from '../../hooks/useInView';
import { useActiveProduct } from '../../hooks/useActiveProduct';
import { useEffect } from 'react';
import { trackViewContent } from '../../lib/pixel';
import productShot from '../../assets/product-shot.jpg';

const metrics = [
  { label: 'Protein', value: PRODUCT.metrics.protein },
  { label: 'Cal', value: PRODUCT.metrics.calories },
  { label: 'Sugar', value: PRODUCT.metrics.sugar },
  { label: 'Per Sachet', value: `${PRODUCT.sachetGrams}g` },
];

export function ProductIntro() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  // Name/variant here are presentational layout (separate kicker + heading
  // slots) rather than a single combined string, so they stay static -
  // only price (the spec's actual "never hardcode" concern) goes live.
  const { price } = useActiveProduct();

  useEffect(() => {
    if (inView) trackViewContent(price);
  }, [inView, price]);

  return (
    <section id="product" className="scroll-mt-16 bg-lf-black py-20 sm:scroll-mt-20 sm:py-28">
      <Container ref={ref} className="grid items-center gap-12 md:grid-cols-2">
        <img
          src={productShot}
          alt={`${PRODUCT.name} sachet`}
          className="mx-auto aspect-square w-full max-w-sm rounded-sm border border-lf-gold/20 object-cover"
        />
        <div>
          <SectionKicker>{PRODUCT.variant}</SectionKicker>
          <h2 className="text-4xl text-lf-white sm:text-5xl">{PRODUCT.name}</h2>
          <p className="mt-4 max-w-md text-lf-cream/80">
            A functional coffee built for people who train, work, and move hard - protein,
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
