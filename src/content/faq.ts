/**
 * FAQ content. ⛔ Placeholder answers - client must supply final copy
 * (see CLAUDE.md §15.8). Keep grouping (Product / Ordering) when replacing.
 */

export type FaqItem = {
  question: string;
  answer: string;
  group: 'Product' | 'Ordering';
};

export const FAQ: FaqItem[] = [
  {
    group: 'Product',
    question: 'How much protein is in each sachet?',
    answer:
      'Each sachet delivers 15g of protein with less than 100 calories. See the full nutrition panel above for details.',
  },
  {
    group: 'Product',
    question: 'How do I prepare Lean & Fit Protein Coffee?',
    answer:
      'Tear open one sachet, add 180ml of hot water, stir, and enjoy. No blender or extra equipment needed.',
  },
  {
    group: 'Product',
    question: 'Is this suitable for a low-sugar or keto diet?',
    answer:
      'Yes - Lean & Fit is formulated to be low sugar and keto friendly. Check the badges and nutrition panel for exact figures.',
  },
  {
    group: 'Product',
    question: 'Are there any allergens I should know about?',
    answer:
      'Full ingredient and allergen information is listed in the "What\'s Inside" section. If you have specific dietary concerns, please contact us before ordering.',
  },
  {
    group: 'Ordering',
    question: 'How do I pay for my order?',
    answer:
      'We currently accept GCash and bank transfer. After checkout, you\'ll see payment instructions and can upload your proof of payment directly on the confirmation form.',
  },
  {
    group: 'Ordering',
    question: 'How long does delivery take?',
    answer:
      'Delivery times will be confirmed once your payment is verified. You\'ll receive email updates at every step, from verification to shipping.',
  },
  {
    group: 'Ordering',
    question: 'How will I know my order was received?',
    answer:
      'You\'ll get an order confirmation on-screen and by email immediately after checkout, plus updates as your payment is verified and your order ships.',
  },
];
