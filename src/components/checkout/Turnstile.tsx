import { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile - client request: "add a captcha before a Cash on
// delivery order gets submitted... to protect from spam orders." Turnstile
// (not reCAPTCHA) since this site is already hosted on Cloudflare Pages -
// same vendor, free, and privacy-respecting (no cookie consent banner
// needed, unlike reCAPTCHA). Only wired into the COD branch of checkout
// (see Checkout.tsx) - Ganap already has real friction (an external
// payment gateway), COD does not, so that's the actual spam vector.
//
// The widget script is loaded lazily (only when this component mounts,
// i.e. only when a customer has COD selected) rather than added globally
// to index.html, so pages that never touch checkout never pay for it.

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load verification script.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function Turnstile({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      setLoadError('Verification is not configured yet. Please contact us to complete your order.');
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': () => setLoadError('Verification failed to load. Please refresh and try again.'),
          theme: 'dark',
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the verification challenge. Please refresh and try again.');
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return <p className="text-sm text-lf-error">{loadError}</p>;
  }

  return <div ref={containerRef} />;
}
