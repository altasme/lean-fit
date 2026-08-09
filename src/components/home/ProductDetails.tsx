import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { Badge } from '../ui/Badge';
import { PRODUCT } from '../../content/product';

const NUTRITION_ROWS: Array<[string, string]> = [
  ['Serving Size', PRODUCT.nutrition.servingSize],
  ['Servings Per Box', String(PRODUCT.nutrition.servingsPerBox)],
  ['Calories', PRODUCT.nutrition.calories],
  ['Total Fat', PRODUCT.nutrition.totalFat],
  ['Saturated Fat', PRODUCT.nutrition.saturatedFat],
  ['Trans Fat', PRODUCT.nutrition.transFat],
  ['Cholesterol', PRODUCT.nutrition.cholesterol],
  ['Sodium', PRODUCT.nutrition.sodium],
  ['Total Carbohydrate', PRODUCT.nutrition.totalCarb],
  ['Dietary Fiber', PRODUCT.nutrition.dietaryFiber],
  ['Total Sugars', PRODUCT.nutrition.totalSugars],
  ['Added Sugars', PRODUCT.nutrition.addedSugars],
  ['Protein', PRODUCT.nutrition.protein],
  ['Vitamin D', PRODUCT.nutrition.vitaminD],
  ['Calcium', PRODUCT.nutrition.calcium],
  ['Iron', PRODUCT.nutrition.iron],
  ['Potassium', PRODUCT.nutrition.potassium],
];

export function ProductDetails() {
  return (
    <section id="details" className="bg-lf-charcoal py-20 sm:py-28">
      <Container className="grid gap-14 lg:grid-cols-2">
        <div>
          <SectionKicker>What&apos;s Inside</SectionKicker>
          <h2 className="text-4xl text-lf-white sm:text-5xl">Full Nutrition Panel</h2>

          <div className="mt-6 flex flex-wrap gap-2">
            {PRODUCT.badges.map((b) => (
              <Badge key={b}>{b}</Badge>
            ))}
          </div>

          <h3 className="mt-10 font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Ingredients
          </h3>
          <p className="mt-2 text-sm text-lf-cream/80">{PRODUCT.ingredients.join(', ')}</p>

          <h3 className="mt-10 font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            How To Prepare
          </h3>
          <ol className="tabular mt-3 space-y-2">
            {PRODUCT.prep.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-lf-cream/80">
                <span className="font-kicker text-lf-gold">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="tabular rounded-sm border border-white/10 bg-lf-black p-6 sm:p-8">
          <h3 className="border-b-4 border-lf-white pb-2 font-display text-2xl uppercase text-lf-white">
            Nutrition Facts
          </h3>
          <dl className="divide-y divide-white/10">
            {NUTRITION_ROWS.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-lf-cream/70">{label}</dt>
                <dd className="font-medium text-lf-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
