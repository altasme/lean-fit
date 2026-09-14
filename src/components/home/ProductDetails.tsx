import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { Badge } from '../ui/Badge';
import { Reveal } from '../ui/Reveal';
import { PRODUCT } from '../../content/product';

type NutritionRow = { label: string; value: string; reni?: string };

const RENI = PRODUCT.nutritionPercentRENI;

const NUTRITION_ROWS: NutritionRow[] = [
  { label: 'Serving Size', value: PRODUCT.nutrition.servingSize },
  { label: 'Servings Per Box', value: String(PRODUCT.nutrition.servingsPerBox) },
  { label: 'Calories', value: PRODUCT.nutrition.calories, reni: RENI.calories },
  { label: 'Calories from Fat', value: PRODUCT.nutrition.caloriesFromFat },
  { label: 'Total Fat', value: PRODUCT.nutrition.totalFat, reni: RENI.totalFat },
  { label: 'Saturated Fat', value: PRODUCT.nutrition.saturatedFat, reni: RENI.saturatedFat },
  { label: 'Unsaturated Fat', value: PRODUCT.nutrition.unsaturatedFat },
  { label: 'Trans Fat', value: PRODUCT.nutrition.transFat },
  { label: 'Cholesterol', value: PRODUCT.nutrition.cholesterol, reni: RENI.cholesterol },
  { label: 'Sodium', value: PRODUCT.nutrition.sodium, reni: RENI.sodium },
  { label: 'Total Carbohydrates', value: PRODUCT.nutrition.totalCarb, reni: RENI.totalCarb },
  { label: 'Dietary Fiber', value: PRODUCT.nutrition.dietaryFiber, reni: RENI.dietaryFiber },
  { label: 'Sugar', value: PRODUCT.nutrition.totalSugars },
  { label: 'Total Protein', value: PRODUCT.nutrition.protein, reni: RENI.protein },
];

export function ProductDetails() {
  return (
    <section id="details" className="bg-lf-charcoal py-20 sm:py-28">
      <Container className="grid gap-14 lg:grid-cols-2">
        <Reveal>
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
        </Reveal>

        <Reveal
          className="tabular rounded-sm border border-white/10 bg-lf-black p-6 sm:p-8"
          delay={150}
        >
          <h3 className="border-b-4 border-lf-white pb-2 font-display text-2xl uppercase text-lf-white">
            Nutrition Facts
          </h3>
          <div className="flex items-center justify-between pt-2 text-[11px] uppercase tracking-wide2 text-lf-cream/50">
            <span>Amount Per Serving</span>
            <span>% RENI</span>
          </div>
          <dl className="divide-y divide-white/10">
            {NUTRITION_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-lf-cream/70">{row.label}</dt>
                <dd className="flex items-baseline gap-3">
                  <span className="font-medium text-lf-white">{row.value}</span>
                  {row.reni && <span className="w-10 text-right text-lf-gold">{row.reni}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <ul className="mt-4 space-y-1 text-[11px] leading-relaxed text-lf-cream/40">
            {PRODUCT.nutritionFootnotes.map((note) => (
              <li key={note}>* {note}</li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
