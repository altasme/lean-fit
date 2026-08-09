import { forwardRef } from 'react';
import type { PropsWithChildren } from 'react';

export const Container = forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string }>>(
  function Container({ children, className = '' }, ref) {
    return (
      <div ref={ref} className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
        {children}
      </div>
    );
  },
);
