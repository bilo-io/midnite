'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Scroll-revealed section wrapper. Toggles `data-revealed` once the element
 * enters the viewport, driving the `.reveal` keyframe in globals.css. Pair with
 * `delay` to stagger siblings.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — ref type narrows per Tag; all targets are HTMLElements.
      ref={ref}
      data-revealed={revealed}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn('reveal', className)}
    >
      {children}
    </Tag>
  );
}

/**
 * Keeps a section's static content in the half of the page opposite the fixed
 * preview panel so the panel never occludes it. On desktop (≥ lg, where the
 * morphing <PreviewPanel> is shown) the content is constrained to one half and
 * hugged to `side`; below lg the panel stacks inline, so content spans full width.
 * `side` is the side the content sits on — i.e. the opposite of the panel's
 * placement for that section (panel right → content left, and vice-versa).
 */
export function SideColumn({
  side,
  className,
  children,
}: {
  side: 'left' | 'right';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        // mobile/tablet: a centred readable column (panel stacks inline).
        'mx-auto max-w-3xl',
        // desktop: half the viewport, hugged to `side`, so the fixed panel in the
        // other half never overlaps it.
        'lg:mx-0 lg:w-1/2 lg:max-w-none',
        side === 'left' ? 'lg:mr-auto lg:pr-10' : 'lg:ml-auto lg:pl-10',
        className,
      )}
    >
      {children}
    </div>
  );
}
