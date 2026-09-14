/**
 * Static legal page content (Privacy, Refund, Shipping policies) - kept
 * here rather than hardcoded in the page components, same content/*.ts
 * convention as everything else (CLAUDE.md §0.2).
 *
 * ⛔ These are standard, honest boilerplate policies grounded in how the
 * store actually operates today (manual GCash/Maya/Bank + COD, manual
 * payment verification, no accounts/subscriptions - CLAUDE.md §13), NOT
 * a lawyer-reviewed document. A few specifics genuinely depend on
 * business decisions that haven't been made yet (delivery fee/coverage
 * is still open per CLAUDE.md §15.1, and there's no refund-window/
 * shipping-timeframe policy decided anywhere in this codebase) - those
 * are marked `[CONFIRM: ...]` inline rather than invented. Have counsel
 * review before launch, and fill in every `[CONFIRM: ...]` first.
 */

export type LegalSection = { heading: string; body: string[] };
export type LegalPage = { title: string; intro: string; sections: LegalSection[] };

export const LEGAL_LAST_UPDATED = 'September 14, 2026';
export const LEGAL_CONTACT_EMAIL = 'support@leanandfit.ph';

export const PRIVACY_POLICY: LegalPage = {
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy explains what information Lean & Fit Protein Coffee ("Lean & Fit," "we," "us") collects when you visit leanandfit.ph or place an order, and how we use and protect it, in line with the Philippine Data Privacy Act of 2012 (RA 10173).',
  sections: [
    {
      heading: 'Information We Collect',
      body: [
        'When you place an order, we collect the information you provide at checkout: your name, email address, mobile number, delivery address, and (for GCash, Maya, or Bank Transfer payments) a screenshot or photo of your proof of payment, along with the reference number and amount you enter.',
        'We do not ask for or store your GCash, Maya, or online banking password or PIN - only the proof of payment you choose to upload.',
        'When you browse the site, we (via Meta Pixel) collect standard browsing information - pages viewed, general device/browser information, and on-site actions like starting checkout - to measure and improve our advertising.',
      ],
    },
    {
      heading: 'How We Use Your Information',
      body: [
        'To process and fulfill your order: verifying payment, packing, shipping, and keeping you updated by email at each step.',
        'To contact you about your order if something needs your attention (for example, if we can\'t verify a payment).',
        'To measure and improve our Facebook/Instagram/TikTok advertising, using Meta Pixel.',
        'We do not sell your personal information to third parties.',
      ],
    },
    {
      heading: 'Who We Share It With',
      body: [
        'Service providers who help us run the store: Supabase (database and file storage), Resend (order and account emails), and Meta (advertising measurement via Pixel). Each only receives what it needs to do its job.',
        'Our courier/delivery partner receives your name, mobile number, and delivery address to complete delivery.',
        'We do not share your information with any other third party except as required by law.',
      ],
    },
    {
      heading: 'Data Retention',
      body: [
        'We keep your order and payment records for as long as needed to fulfill your order, handle any related support or refund requests, and meet our legal/tax record-keeping obligations. [CONFIRM: a specific retention period once available, e.g. from your accountant/tax requirements.]',
      ],
    },
    {
      heading: 'Your Rights',
      body: [
        'Under the Data Privacy Act, you have the right to be informed, to access, to correct, to object to processing, and to request deletion of your personal information, subject to our legal obligations (for example, we may need to keep order records for tax purposes even after a deletion request).',
        `To exercise any of these rights, contact us at ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: 'Changes To This Policy',
      body: [
        'We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects the most recent version.',
      ],
    },
  ],
};

export const REFUND_POLICY: LegalPage = {
  title: 'Refund Policy',
  intro:
    'This policy explains how order cancellations, payment issues, and refunds are handled for orders placed on leanandfit.ph.',
  sections: [
    {
      heading: 'Before Your Order Ships',
      body: [
        'GCash / Maya / Bank Transfer: after you submit your order, our team manually verifies your proof of payment. If we can\'t verify it, we\'ll contact you to resolve it before your order is processed - you won\'t be charged again, and no product is shipped until payment is confirmed.',
        'Cash on Delivery (COD): since payment is only collected when your order arrives, you may cancel a COD order any time before it ships at no cost by contacting us.',
      ],
    },
    {
      heading: 'Cancellations After Shipping',
      body: [
        'Once an order has shipped, it can no longer be cancelled, but you may request a return or refund below if there\'s an issue with what you received.',
      ],
    },
    {
      heading: 'Refund Eligibility',
      body: [
        'We offer a refund or replacement if: your order arrives damaged, you received the wrong item, or your GCash/Maya/Bank payment was verified and charged but the order could not be fulfilled.',
        'Contact us within [CONFIRM: number of days, e.g. "7 days"] of receiving your order, with a photo of the issue where applicable, and we\'ll review your request.',
        '[CONFIRM: whether change-of-mind returns are accepted, and any condition requirements (e.g. unopened sachets) - not yet decided.]',
      ],
    },
    {
      heading: 'How Refunds Are Issued',
      body: [
        'Approved refunds for GCash/Maya/Bank Transfer payments are sent back to the same account used to pay, or another method we agree on with you.',
        'Since Cash on Delivery is paid on arrival, an approved COD refund is coordinated directly with you (for example, bank transfer or GCash).',
        `Refunds are processed manually by our team - contact ${LEGAL_CONTACT_EMAIL} with your order number to start a request. [CONFIRM: typical processing time once your team has a sense of it, e.g. "within 5-7 business days of approval."]`,
      ],
    },
  ],
};

export const SHIPPING_POLICY: LegalPage = {
  title: 'Shipping Policy',
  intro:
    'This policy explains how orders placed on leanandfit.ph are processed, shipped, and delivered.',
  sections: [
    {
      heading: 'Delivery Coverage & Fees',
      body: [
        '[CONFIRM: which areas/provinces we currently deliver to, and the delivery fee(s) for each - this is still being finalized (CLAUDE.md §15.1). Once set, the exact fee for your address is always shown at checkout before you pay.]',
      ],
    },
    {
      heading: 'Order Processing',
      body: [
        'GCash / Maya / Bank Transfer orders begin processing once our team has verified your proof of payment.',
        'Cash on Delivery orders begin processing as soon as they\'re placed.',
        '[CONFIRM: typical processing time before an order is handed to the courier, e.g. "1-2 business days."]',
      ],
    },
    {
      heading: 'Delivery Time & Tracking',
      body: [
        '[CONFIRM: typical delivery timeframe per area once a courier partner is finalized, e.g. "3-7 business days within Metro Manila, longer for provincial addresses."]',
        'Once your order ships, we\'ll email you with the courier name and tracking number so you can follow its progress.',
      ],
    },
    {
      heading: "If Delivery Doesn't Reach You",
      body: [
        'If our courier is unable to deliver your order after reasonable attempts, it will be returned to us. We\'ll reach out to arrange redelivery (delivery fees may apply again) or a refund/cancellation per our Refund Policy.',
        'For Cash on Delivery orders that are never collected, no payment is taken - there\'s nothing to refund.',
      ],
    },
    {
      heading: 'Damaged Or Missing Items',
      body: [
        'If your order arrives damaged or incomplete, contact us within [CONFIRM: number of days, e.g. "48 hours"] with a photo, and we\'ll arrange a replacement or refund per our Refund Policy.',
      ],
    },
  ],
};
