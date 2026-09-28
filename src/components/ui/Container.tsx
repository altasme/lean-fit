import { forwardRef } from 'react';
import type { PropsWithChildren } from 'react';

export const Container = forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string }>>(
  function Container({ children, className = '' }, ref) {
    // Tailwind's generated CSS orders utilities by theme scale, not by
    // where they appear in a class string - a caller-supplied `max-w-3xl`
    // sits earlier in that scale than `max-w-6xl` and so loses the cascade
    // regardless of DOM order, silently widening every narrower Container
    // (FAQ, Checkout, legal pages, etc.) back out to the 6xl default. Only
    // apply the default when the caller hasn't supplied their own.
    const hasMaxWidth = /(^|\s)max-w-/.test(className);
    return (
      <div ref={ref} className={`mx-auto w-full px-5 sm:px-8 ${hasMaxWidth ? '' : 'max-w-6xl'} ${className}`}>
        {children}
      </div>
    );
  },
);
