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
