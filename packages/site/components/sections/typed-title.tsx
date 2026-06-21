'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useIsSectionActive } from './section-controller';
import { useTypewriter } from './use-typewriter';

type TypedTitleProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** When set, typing starts the first time this section becomes active. */
  sectionId?: string;
  className?: string;
  /** Extra content (body copy, CTAs) faded in once typing completes. */
  children?: ReactNode;
};

/**
 * A section heading that types its title (then subtitle) out on entry, then fades in
 * any children. Typing latches on first activation (type-once, per the plan). The
 * animated text is `aria-hidden`; an `sr-only` copy carries the real text for
 * assistive tech and crawlers. Under reduced motion the typewriter resolves instantly
 * and the fade is disabled.
 */
export function TypedTitle({
  title,
  subtitle,
  eyebrow,
  sectionId,
  className,
  children,
}: TypedTitleProps) {
  const active = useIsSectionActive(sectionId);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (active) setStarted(true);
  }, [active]);

  const titleTw = useTypewriter({ text: title, start: started });
  const subtitleTw = useTypewriter({
    text: subtitle ?? '',
    start: started && titleTw.done && Boolean(subtitle),
  });
  const headingDone = subtitle ? subtitleTw.done : titleTw.done;

  return (
    <div className={className}>
      {eyebrow ? (
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        <span aria-hidden="true">{titleTw.displayed}</span>
        {!titleTw.done ? <span aria-hidden="true" className="caret" /> : null}
        <span className="sr-only">{title}</span>
      </h2>
      {subtitle ? (
        <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
          <span aria-hidden="true">{subtitleTw.displayed}</span>
          {started && titleTw.done && !subtitleTw.done ? (
            <span aria-hidden="true" className="caret" />
          ) : null}
          <span className="sr-only">{subtitle}</span>
        </p>
      ) : null}
      {children ? (
        <div
          className={cn(
            'transition-opacity duration-700 ease-out motion-reduce:transition-none',
            headingDone ? 'opacity-100' : 'opacity-0',
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
