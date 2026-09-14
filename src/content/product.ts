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
  sachetGrams: 21,
  sachetsPerBox: 10,
  boxGrams: 210,

  /**
   * Delivery fee(s). ⛔ Still a placeholder flat rate - client must confirm
   * coverage and pricing (see §15.1). Keep at 0 until confirmed rather than
   * guessing.
   */
  deliveryFee: 0,

  currency: 'PHP',

  metrics: {
    protein: '11g',
    calories: '100',
    sugar: 'Low', // 1g total
    transFat: '0g',
  },

  /**
   * Client-supplied Nutrition Facts panel (confirmed 2026-09-14) - resolves
   * §4c.4's open item: this is the manufacturer's actual verified label,
   * not a corrected guess, so `sachetGrams` above and every value here
   * were updated to match it exactly rather than the earlier 25g/15g
   * placeholder figures. % RENI (Recommended Energy and Nutrient Intake)
   * is the panel's own reference column - see `nutritionPercentRENI` /
   * `nutritionFootnotes` below - and only covers the nutrients the panel
   * itself lists a % for; nutrients with no % Daily Value under FDA
   * guidelines (Unsaturated Fat, Trans Fat, Total/Added Sugars) don't get
   * an entry. Micronutrients not on this panel (Vitamin D, Calcium, Iron,
   * Potassium) were dropped entirely rather than carrying over the old
   * placeholder numbers, which were never this formula's real values.
   */
  nutrition: {
    servingSize: '1 Sachet (21g)',
    servingsPerBox: 10,
    calories: '100 kcal',
    caloriesFromFat: '30 kcal',
    totalFat: '3g',
    saturatedFat: '2g',
    unsaturatedFat: '1g',
    transFat: '0g',
    cholesterol: '100mg',
    sodium: '30mg',
    totalCarb: '3g',
    dietaryFiber: '2g',
    totalSugars: '1g',
    protein: '11g',
  },

  /** % RENI shown on the panel next to each nutrient it covers - see `nutrition` above. */
  nutritionPercentRENI: {
    calories: '4%',
    totalFat: '5%',
    saturatedFat: '12%',
    cholesterol: '0%',
    sodium: '3%',
    totalCarb: '5%',
    dietaryFiber: '1%',
    protein: '23%',
  },

  nutritionFootnotes: [
    'Percent RENI values are based on 2015 RENI for the reference requirement of 19–29-year-old male.',
    'Daily Values: U.S. FDA, used if no RENI.',
    'No recommended % Daily Values are provided for nutrients/elements where none are specified in the U.S. FDA guideline for Nutrition Labeling.',
  ],

  badges: ['Low Sugar', 'No Added Preservatives', 'Gluten Free', 'Keto Friendly'],

  prep: ['Tear 1 sachet', 'Add 180ml hot water', 'Stir', 'Enjoy'],

  /**
   * Final formula, client-supplied (2026-09-14) - resolves §4c.3/§4c.4:
   * no Senna Leaf Extract in this formula (the "daily/anytime" usage copy
   * in §5 no longer needs the laxative caveat), and this is the one
   * approved ingredient list, superseding the placeholder that mixed
   * ingredients from images 5/10/11. The 21g net sachet weight this list
   * implied is now confirmed correct by the client's actual Nutrition
   * Facts panel (see `nutrition` above) - `sachetGrams`/`metrics.protein`
   * were corrected to match it, not the other way around.
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
   * All 8 of `ingredients` above, as cards (spec §5.7) - the 4 with an
   * actual wellness story get highlighted (`functional: true`) in
   * IngredientsSpotlight.tsx; the other 4 (Non-Dairy Creamer/Premix
   * Coffee Powder/Sweetener Blend/Hazelnut Flavor) are the base/flavor
   * blend and get plainer, purely descriptive cards - nothing dishonestly
   * inflated just to give them a "benefit." Blurbs throughout are
   * deliberately descriptive, not efficacy claims (e.g. Garcinia Cambogia
   * isn't said to DO anything) - claim approval is still open per §15.4.
   */
  functionalIngredients: [
    {
      name: 'Whey Protein Concentrate',
      blurb: 'A quality protein source to help keep you full and support an active lifestyle.',
      functional: true,
    },
    {
      name: 'Garcinia Cambogia',
      blurb: 'A popular addition to many wellness and weight-management routines.',
      functional: true,
    },
    {
      name: 'Hydrolyzed Collagen',
      blurb: 'Supports skin, joints, and connective tissue.',
      functional: true,
    },
    {
      name: 'Chia Seed',
      blurb: 'Fiber and micronutrients in every sachet.',
      functional: true,
    },
    {
      name: 'Non-Dairy Creamer',
      blurb: 'Gives every cup its smooth, creamy texture.',
      functional: false,
    },
    {
      name: 'Premix Coffee Powder',
      blurb: 'The coffee base itself, for a familiar coffee taste in every sachet.',
      functional: false,
    },
    {
      name: 'Sweetener & Flavor Premix',
      blurb: 'A light sweetness (Stevia/Sucralose Blend) with virtually no added sugar.',
      functional: false,
    },
    {
      name: 'Hazelnut Flavor',
      blurb: 'Rounds out the blend with a warm, nutty finish.',
      functional: false,
    },
  ],

  social: {
    handle: '@leanfitcoffee',
    // ⚠️ The `handle` above is CLAUDE.md §3's locked brand handle, but the
    // client-supplied real account URLs below (confirmed 2026-09-14) don't
    // match it - Instagram is actually @leanandfit2026, TikTok is
    // @leanandfit1, and the Facebook link is a share-link that doesn't
    // reveal a page handle at all. Not silently reconciled either
    // direction - flag to the client before launch (the footer/social-proof
    // copy still displays `@leanfitcoffee`, which visitors could find
    // confusing if the linked accounts show a different handle).
    // Instagram/TikTok query strings are copied verbatim as given, not
    // trimmed, since stripping them isn't guaranteed safe.
    links: {
      facebook: 'https://www.facebook.com/share/1BtNW8dHpa/',
      instagram: 'https://www.instagram.com/leanandfit2026?stkn=MXNkbzFqcmNjaWdhNg==',
      tiktok: 'https://www.tiktok.com/@leanandfit1?_r=1&_t=ZS-99ig8WwFP6K',
    },
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
