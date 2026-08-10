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
    group: 'Product',
    question: 'How should I store Lean & Fit Protein Coffee?',
    answer:
      'Keep sachets sealed in a cool, dry place away from direct sunlight. Once opened, use the full sachet in one serving.',
  },
  {
    group: 'Product',
    question: 'Can I drink this every day?',
    answer:
      'Lean & Fit is designed to fit into your daily routine. As with any dietary product, listen to your body and check with a healthcare professional if you have specific health concerns.',
  },
  {
    group: 'Product',
    question: 'Does it taste like regular coffee?',
    answer:
      'Yes - it has the same rich coffee flavor you\'re used to, with the added protein and functional ingredients blended in, no chalky or artificial aftertaste.',
  },
  {
    group: 'Ordering',
    question: 'How do I pay for my order?',
    answer:
      'We accept GCash, Maya, bank transfer, and Cash on Delivery (COD). After checkout, you\'ll see payment instructions for your chosen method - for GCash, Maya, and bank transfer, you\'ll upload proof of payment on the confirmation form; for COD, you simply pay when your order arrives.',
  },
  {
    group: 'Ordering',
    question: 'How long does delivery take?',
    answer:
      'Delivery times will be confirmed once your payment is verified (or immediately for Cash on Delivery orders). You\'ll receive email updates at every step, from verification to shipping.',
  },
  {
    group: 'Ordering',
    question: 'How will I know my order was received?',
    answer:
      'You\'ll get an order confirmation on-screen and by email immediately after checkout, plus updates as your payment is verified and your order ships.',
  },
  {
    group: 'Ordering',
    question: 'Can I change or cancel my order after checkout?',
    answer:
      'Message us as soon as possible after placing your order. If it hasn\'t been packed yet, we\'ll do our best to update or cancel it for you.',
  },
  {
    group: 'Ordering',
    question: 'What areas do you deliver to?',
    answer:
      'We\'re finalizing our delivery coverage and fees - this section will be updated soon. In the meantime, place your order and we\'ll confirm delivery details with you directly.',
  },
  {
    group: 'Ordering',
    question: 'What if my GCash/Maya/bank transfer payment isn\'t verified?',
    answer:
      'If there\'s an issue with your proof of payment, we\'ll email you with what needs correcting so you can resubmit - your order stays reserved while this is sorted out.',
  },
];
