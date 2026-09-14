/**
 * Product facts, claims, and packaging details that aren't yet part of the
 * admin-managed data model (see CLAUDE.md §4 for the original intent).
 *
 * ⛔ BLOCKING ITEMS - see §4c / §15. This file ships with locked facts plus
 * placeholders for everything the client has not yet confirmed. The site
 * must not go live until those are resolved.
 *
 * PRICE IS NOT HERE ANYMORE. SRP now lives in the Supabase `products`
 * table, admin-editable at `/admin/products`, and is fetched live via
 * `src/lib/product.ts` (`fetchActiveProduct`) / `useActiveProduct()` -
 * Admin Panel spec §12/§26 non-negotiable rule #1 ("do not hard-code
 * product prices"). Every component that shows or calculates a price
 * (Purchase, ProductIntro, OrderSummary, Checkout, the cart store) reads
 * it from there, never from this file.
 */

export const PRODUCT = {
  name: 'Lean & Fit Protein Coffee',
  variant: 'Classic',
  sachetGrams: 25,
  sachetsPerBox: 10,
  boxGrams: 250,

  /**
   * Delivery fee(s). ⛔ Still a placeholder flat rate - client must confirm
   * coverage and pricing (see §15.1). Keep at 0 until confirmed rather than
   * guessing.
   */
  deliveryFee: 0,

  currency: 'PHP',

  metrics: {
    protein: '15g',
    calories: '<100', // panel shows 90 kcal
    sugar: 'Low', // 1g total, 0g added
    transFat: '0g',
  },

  nutrition: {
    servingSize: '1 Sachet (25g)',
    servingsPerBox: 10,
    calories: '90 kcal',
    totalFat: '2g',
    saturatedFat: '1g',
    transFat: '0g',
    cholesterol: '5mg',
    sodium: '60mg',
    totalCarb: '6g',
    dietaryFiber: '2g',
    totalSugars: '1g',
    addedSugars: '0g',
    protein: '15g',
    vitaminD: '0mcg',
    calcium: '80mg',
    iron: '0.5mg',
    potassium: '150mg',
  },

  badges: ['Low Sugar', 'No Added Preservatives', 'Gluten Free', 'Keto Friendly'],

  prep: ['Tear 1 sachet', 'Add 180ml hot water', 'Stir', 'Enjoy'],

  /**
   * Final formula, client-supplied (2026-09-14) - resolves §4c.3/§4c.4:
   * no Senna Leaf Extract in this formula (the "daily/anytime" usage copy
   * in §5 no longer needs the laxative caveat), and this is the one
   * approved ingredient list, superseding the placeholder that mixed
   * ingredients from images 5/10/11.
   *
   * ⚠️ NOT YET RECONCILED: the client's ingredient-weight breakdown totals
   * 21.00g net per sachet, not the 25g locked in `sachetGrams` above /
   * `nutrition.servingSize` below, and its Whey Protein Concentrate line
   * (10g of the sachet, and whey protein CONCENTRATE is well under 100%
   * protein by weight) doesn't obviously support the locked "15g protein"
   * in `metrics.protein` / `nutrition.protein`. Left those numbers
   * untouched rather than guessing corrected figures - flag to the client
   * before launch, since a nutrition panel overstating protein or the
   * wrong net weight is a real labeling/compliance risk, not just
   * marketing copy.
   */
  ingredients: [
    'Whey Protein Concentrate',
    'Non-Dairy Creamer',
    'Premix Coffee Powder',
    'Garcinia Cambogia',
    'Hydrolyzed Collagen',
    'Chia Seed',
    'Sweetener & Flavor Premix (Stevia/Sucralose Blend)',
    'Hazelnut Flavor',
  ],

  /**
   * ⚠️ SEE §4c.5 - client owns final claim approval. Kept here so the
   * approved list is a one-file edit. Default to lifestyle framing for
   * anything unconfirmed rather than asserting a medical/functional claim.
   */
  claims: [
    'Fuels an active lifestyle',
    'Supports muscle recovery',
    'Made for your morning routine',
    'Low sugar, high protein',
    'Aids digestion', // ⛔ unconfirmed functional claim - verify before launch
  ],

  /**
   * The subset of `ingredients` above with an actual wellness story to
   * tell (spec §5.7) - Non-Dairy Creamer/Premix Coffee Powder/Sweetener
   * Blend/Hazelnut Flavor are base/flavor ingredients with nothing
   * distinct to spotlight, same reasoning that kept "Instant Coffee" and
   * "Natural Flavors" out of this list before. Blurbs are deliberately
   * descriptive, not efficacy claims (e.g. Garcinia Cambogia isn't said
   * to DO anything) - claim approval is still open per §15.4.
   */
  functionalIngredients: [
    {
      name: 'Whey Protein Concentrate',
      blurb: 'A quality protein source to help keep you full and support an active lifestyle.',
    },
    {
      name: 'Garcinia Cambogia',
      blurb: 'A popular addition to many wellness and weight-management routines.',
    },
    {
      name: 'Hydrolyzed Collagen',
      blurb: 'Supports skin, joints, and connective tissue.',
    },
    {
      name: 'Chia Seed',
      blurb: 'Fiber and micronutrients in every sachet.',
    },
  ],

  social: {
    handle: '@leanfitcoffee',
    platforms: ['Facebook', 'Instagram', 'TikTok'],
  },
} as const;

export const TAGLINE = {
  primary: 'FUEL YOUR DAY. SHAPE YOUR BEST.',
  hero: 'COFFEE THAT WORKS AS HARD AS YOU DO.',
  supporting: 'LOOK GOOD. FEEL STRONG.',
  hashtag: '#LeanStrongConfident',
  essence:
    "We don't just make coffee. We fuel your discipline and power your transformation.",
} as const;
