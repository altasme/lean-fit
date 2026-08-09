/**
 * Single source of truth for product facts, claims, and pricing.
 * Do not hardcode any of this in components — see CLAUDE.md §4.
 *
 * ⛔ BLOCKING ITEMS — see §4c / §15. This file ships with locked facts plus
 * placeholders for everything the client has not yet confirmed. The site
 * must not go live until those are resolved.
 */

export const PRODUCT = {
  name: 'Lean & Fit Protein Coffee',
  variant: 'Classic',
  sachetGrams: 25,
  sachetsPerBox: 10,
  boxGrams: 250,

  /**
   * ⛔ BLOCKING — client must supply base price (PHP). `null` until then.
   * Every consumer of this value (purchase section, checkout, cart math)
   * must handle `null` by disabling ordering, not by silently defaulting.
   */
  price: null as number | null,

  /**
   * Delivery fee(s). Placeholder flat rate — client must confirm coverage
   * and pricing (see §15.1). Keep at 0 until confirmed rather than guessing.
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
   * ⚠️ SEE §4c.4 — ingredient list differs across supplied assets.
   * Placeholder list below; client must approve one final list before launch.
   * Includes Senna Leaf Extract per image 5 — confirm §4c.3 before launch,
   * this changes "daily / anytime" usage copy if it stays in the formula.
   */
  ingredients: [
    'Whey Protein Isolate',
    'Instant Coffee',
    'Inulin (Prebiotic Fiber)',
    'L-Carnitine',
    'Green Tea Extract',
    'Chia Seed',
    'Collagen Peptides',
    'Natural Flavors',
    'Stevia',
    'Laxative (Senna Leaf Extract)', // ⛔ confirm before launch — §4c.3
  ],

  /**
   * ⚠️ SEE §4c.5 — client owns final claim approval. Kept here so the
   * approved list is a one-file edit. Default to lifestyle framing for
   * anything unconfirmed rather than asserting a medical/functional claim.
   */
  claims: [
    'Fuels an active lifestyle',
    'Supports muscle recovery',
    'Made for your morning routine',
    'Low sugar, high protein',
    'Aids digestion', // ⛔ unconfirmed functional claim — verify before launch
  ],

  functionalIngredients: [
    {
      name: 'Whey Protein',
      blurb: 'Complete protein to support lean muscle and satiety.',
    },
    {
      name: 'Inulin',
      blurb: 'Prebiotic fiber that supports a healthy gut.',
    },
    {
      name: 'L-Carnitine',
      blurb: 'Amino acid compound associated with energy metabolism.',
    },
    {
      name: 'Green Tea Extract',
      blurb: 'A light, natural lift alongside your coffee.',
    },
    {
      name: 'Chia Seed',
      blurb: 'Fiber and micronutrients in every sachet.',
    },
    {
      name: 'Collagen Peptides',
      blurb: 'Supports skin, joints, and connective tissue.',
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
