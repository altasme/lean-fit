/**
 * Meta Pixel helpers. See CLAUDE.md §8 for the funnel → event mapping and
 * the documented decision to fire `Purchase` on order submission (not on
 * verified payment) for MVP.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

let initialized = false;

export function initPixel(): void {
  if (initialized || typeof window === 'undefined' || !PIXEL_ID) return;
  initialized = true;

  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq?.('init', PIXEL_ID);
  window.fbq?.('track', 'PageView');
}

export function trackEvent(event: string, payload?: Record<string, unknown>): void {
  if (!PIXEL_ID) return;
  window.fbq?.('track', event, payload);
}

export function trackViewContent(value: number | null, currency = 'PHP'): void {
  trackEvent('ViewContent', {
    content_ids: ['lf-classic'],
    content_type: 'product',
    value: value ?? undefined,
    currency,
  });
}

export function trackInitiateCheckout(value: number, numItems: number, currency = 'PHP'): void {
  trackEvent('InitiateCheckout', { value, currency, num_items: numItems });
}

export function trackAddPaymentInfo(value: number, currency = 'PHP'): void {
  trackEvent('AddPaymentInfo', { value, currency });
}

export function trackPurchase(opts: {
  value: number;
  currency?: string;
  contentIds?: string[];
  numItems: number;
  orderId: string;
}): void {
  const { value, currency = 'PHP', contentIds = ['lf-classic'], numItems, orderId } = opts;
  if (!PIXEL_ID) return;
  window.fbq?.(
    'track',
    'Purchase',
    { value, currency, content_ids: contentIds, num_items: numItems },
    { eventID: orderId },
  );
}
