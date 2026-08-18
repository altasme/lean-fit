import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { PRODUCT } from '../../content/product';
import sectionBg from '../../assets/backgrounds/ingredients-bg.jpg';

export function IngredientsSpotlight() {
  return (
    <section
      id="ingredients"
      className="relative scroll-mt-16 overflow-hidden bg-lf-black py-20 sm:scroll-mt-20 sm:py-28"
    >
      <img
        src={sectionBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Flat opacity isn't enough here: on a tall/narrow mobile viewport this
          section's height-to-width ratio forces object-cover to scale by
          height, so the image's full vertical span (including the bright
          gold band at its very top edge) always shows regardless of
          object-position - a top-weighted gradient masks that reliably at
          any crop, same technique as Hero's overlay. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(13,13,13,0.9) 0%, rgba(13,13,13,0.55) 18%, rgba(13,13,13,0.5) 60%, rgba(13,13,13,0.65) 100%)',
        }}
      />
      <Container className="relative">
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
