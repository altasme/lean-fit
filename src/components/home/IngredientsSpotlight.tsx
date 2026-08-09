import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { PRODUCT } from '../../content/product';

export function IngredientsSpotlight() {
  return (
    <section id="ingredients" className="bg-lf-black py-20 sm:py-28">
      <Container>
        <div className="text-center">
          <SectionKicker>Functional Ingredients</SectionKicker>
          <h2 className="mx-auto max-w-xl text-4xl text-lf-white sm:text-5xl">
            Every Sachet, Working Harder
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT.functionalIngredients.map((ing) => (
            <div key={ing.name} className="rounded-sm border border-white/10 bg-lf-charcoal/50 p-6">
              <h3 className="font-kicker text-lg uppercase tracking-wide2 text-lf-gold">
                {ing.name}
              </h3>
              <p className="mt-2 text-sm text-lf-cream/75">{ing.blurb}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
