export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Why', href: '#why' },
  { label: 'Ingredients', href: '#ingredients' },
  { label: 'FAQ', href: '#faq' },
] as const;

export const SITE = {
  name: 'Lean & Fit',
  fullName: 'Lean & Fit Protein Coffee',
  social: '@leanfitcoffee',
} as const;

/**
 * ⛔ PLACEHOLDER copy - final wholesale terms/benefits still pending
 * client sign-off. The application itself is real (Reseller Portal Part 1
 * Phase B) - submissions create a pending `partners` row for admin review;
 * package selection + payment come in a later phase.
 */
export const RESELLER = {
  kicker: 'Partner With Us',
  heading: 'BECOME A RESELLER',
  intro:
    "Bring Lean & Fit Protein Coffee to your community. We're building out our reseller program - reach out and we'll follow up as soon as it's ready.",
  benefits: [
    'Resellers Get 25% OFF when you purchase a minimum of 5 boxes',
    'Start with 15 boxes and become a Lean & Fit Distributor with 30% OFF',
    'Marketing assets and product training',
    'Dedicated reseller support',
  ],
  contactEmail: 'partners@leanandfit.ph',
  // Spec Part 1 §45: "Google Drive link... configurable by Admin." No
  // admin UI exists to edit this yet (would live in Phase G's admin
  // partner management) - a content constant is the same swap point
  // CLAUDE.md §0.2 already uses for everything else not yet DB-backed.
  marketingMaterialsUrl: 'https://drive.google.com/drive/folders/PLACEHOLDER',
} as const;

export const BENEFITS = [
  {
    title: 'Fuels Discipline',
    blurb: 'Start every session with 11g of protein and real focus, not just caffeine.',
  },
  {
    title: 'Low Sugar, High Purpose',
    blurb: 'Only 1g of sugar per sachet - built for a lean, active lifestyle.',
  },
  {
    title: 'Supports Recovery',
    blurb: 'Whey protein and collagen peptides work alongside your training.',
  },
  {
    title: 'Grab & Go',
    blurb: 'One sachet, 180ml hot water, done. No blender, no excuses.',
  },
  {
    title: 'Gluten Free & Keto Friendly',
    blurb: 'Fits your plan whether you\'re cutting, maintaining, or building.',
  },
  {
    title: 'Supports Weight Management',
    blurb: 'Helps you stay on track with your daily goals.',
  },
] as const;

export const LIFESTYLE_MOMENTS = [
  { label: 'Morning', copy: 'Start the day fueled before anything else does.' },
  { label: 'Pre-Workout', copy: 'Protein and focus, ready before you hit the floor.' },
  { label: 'Midday', copy: 'Beat the slump without the sugar crash.' },
  { label: 'On the Go', copy: 'Discipline doesn\'t wait for a kitchen.' },
] as const;

/**
 * Client request: swap the testimonials section for a certifications/trust
 * section instead ("Made With Confidence") - no real customer testimonials
 * exist yet, and quality/regulatory certifications are stronger trust
 * signals to lead with in the meantime.
 */
export const QUALITY = {
  kicker: 'Quality',
  heading: 'Made With Confidence',
  subheading: 'Quality you can feel good about.',
  intro:
    'Lean & Fit is proudly made in the Philippines and produced with a focus on quality, consistency, and everyday wellness.',
  standardsLabel: 'Our Quality Standards',
  certifications: [
    {
      title: 'FDA-Registered Manufacturer',
      detail: 'FDA Registration No. LTO-3000014679901',
    },
    {
      title: 'Halal Certified',
      detail: 'Halal Certificate No. ARA-90273575-31204',
    },
  ],
  // ⛔ PLACEHOLDER - client must supply where "Verify Certifications" should
  // link to (e.g. a hosted copy of the certificates, or the FDA/Halal
  // certifying body's public lookup tool) before launch.
  verifyUrl: '#',
  tagline: [
    { emoji: '🇵🇭', label: 'Proudly Filipino-made' },
    { emoji: '🔬', label: 'Carefully formulated' },
    { emoji: '☕', label: 'Made for Your Goals' },
  ],
} as const;

export const COMPARISON = {
  traditional: {
    title: 'Traditional Coffee',
    points: ['Coffee', 'Caffeine', "That's it"],
  },
  leanFit: {
    title: 'Lean & Fit',
    points: ['Coffee', 'Protein', 'Functional Ingredients'],
  },
} as const;
