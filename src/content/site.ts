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

export const BENEFITS = [
  {
    title: 'Fuels Discipline',
    blurb: 'Start every session with 15g of protein and real focus, not just caffeine.',
  },
  {
    title: 'Low Sugar, High Purpose',
    blurb: 'Only 1g total sugar, 0g added — built for a lean, active lifestyle.',
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
] as const;

export const LIFESTYLE_MOMENTS = [
  { label: 'Morning', copy: 'Start the day fueled before anything else does.' },
  { label: 'Pre-Workout', copy: 'Protein and focus, ready before you hit the floor.' },
  { label: 'Midday', copy: 'Beat the slump without the sugar crash.' },
  { label: 'On the Go', copy: 'Discipline doesn\'t wait for a kitchen.' },
] as const;

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
