'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import { cn } from '../../lib/cn';
import { useReadingLink } from './reading-provider';
import { claimSlug, extractText, type SlugRegistry } from './slugify';

const LINK_CLASS =
  'font-medium text-foreground underline underline-offset-4 hover:text-foreground/70';

// Each <Prose> owns one slug registry so sibling headings dedupe against each
// other but two articles on a page never collide. Outside a <Prose> the headings
// still slugify — they just don't dedupe, which is the right trade for a stray
// heading rendered on its own.
const SlugRegistryContext = createContext<SlugRegistry | null>(null);

/**
 * Claims this heading's id exactly once per mounted instance. A `useState`
 * initialiser (not a bare call) keeps the id stable across re-renders — calling
 * `claimSlug` on every render would walk the counter forward and change the
 * anchor under the reader's feet.
 */
function useHeadingId(children: ReactNode, explicitId?: string): string | undefined {
  const registry = useContext(SlugRegistryContext);
  const [id] = useState(() => {
    if (explicitId) return explicitId;
    const text = extractText(children);
    if (!text.trim()) return undefined;
    return registry ? claimSlug(registry, text) : claimSlug(new Map(), text);
  });
  return id;
}

// The three map entries that use hooks are hoisted into named components: a
// lowercase `h2: () => …` reads as a plain function to `rules-of-hooks`, which
// then rejects the hook call. Naming them also makes them legible in DevTools.
function ProseH2({ children, ...props }: ComponentProps<'h2'>) {
  const id = useHeadingId(children, props.id);
  return (
    <h2
      {...props}
      id={id}
      className={cn(
        'mt-10 mb-3 scroll-mt-20 border-b border-border pb-1.5 text-xl font-semibold tracking-tight',
        props.className,
      )}
    >
      {children}
    </h2>
  );
}

function ProseH3({ children, ...props }: ComponentProps<'h3'>) {
  const id = useHeadingId(children, props.id);
  return (
    <h3
      {...props}
      id={id}
      className={cn('mt-6 mb-2 scroll-mt-20 text-base font-semibold', props.className)}
    >
      {children}
    </h3>
  );
}

// Root-relative links (`/app/tasks`) are in-app routes and render through the
// injected link component, so a hash-router host prefixes the `#` correctly.
// External links open off-site in a new tab; `#anchor` stays a plain jump.
function ProseLink({ href, className, children, ...props }: ComponentProps<'a'>) {
  const Link = useReadingLink();
  if (href?.startsWith('/')) {
    return (
      <Link href={href} className={cn(LINK_CLASS, className)}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href ?? '');
  return (
    <a
      {...props}
      href={href}
      className={cn(LINK_CLASS, className)}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {children}
    </a>
  );
}

/**
 * The prose element map — one source of truth for reading typography, consumed by
 * both render paths: docs' `MDXProvider components={…}` and the site's
 * `react-markdown components={…}` (Phase 80 Decision 2). Classes are ported
 * verbatim from docs' `mdx-components.tsx` so the polished docs face renders
 * byte-identically after the migration.
 *
 * `h2`/`h3` **self-slugify** (Decision 1): ids are derived from the heading text
 * at render time, so every consumer gets anchorable headings and a working TOC
 * with no per-app `rehype-slug` build config.
 */
export const proseComponents = {
  h1: (props: ComponentProps<'h1'>) => (
    <h1
      {...props}
      className={cn('mt-2 mb-4 text-3xl font-semibold tracking-tight', props.className)}
    />
  ),
  h2: ProseH2,
  h3: ProseH3,
  // Site legal docs use h4; docs' MDX rarely does. Styled here so neither app
  // falls back to an unthemed browser default.
  h4: (props: ComponentProps<'h4'>) => (
    <h4 {...props} className={cn('mt-4 mb-1.5 text-sm font-semibold', props.className)} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p {...props} className={cn('my-4 leading-7 text-foreground/90', props.className)} />
  ),
  a: ProseLink,
  ul: (props: ComponentProps<'ul'>) => (
    <ul
      {...props}
      className={cn('my-4 ml-6 list-disc space-y-1.5 text-foreground/90', props.className)}
    />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol
      {...props}
      className={cn('my-4 ml-6 list-decimal space-y-1.5 text-foreground/90', props.className)}
    />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li {...props} className={cn('leading-7', props.className)} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote
      {...props}
      className={cn('my-4 border-l-2 border-border pl-4 italic text-muted-foreground', props.className)}
    />
  ),
  // Inline code gets the chip treatment; block code keeps whatever highlighter
  // classes it arrived with (the site runs `rehype-highlight`) and lets <pre>
  // own the background, neutralised below.
  code: (props: ComponentProps<'code'>) => (
    <code
      {...props}
      className={cn(
        'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground',
        props.className,
      )}
    />
  ),
  pre: (props: ComponentProps<'pre'>) => (
    <pre
      {...props}
      className={cn(
        'my-4 overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm leading-6',
        '[&>code]:bg-transparent [&>code]:p-0 [&>code]:text-foreground',
        props.className,
      )}
    />
  ),
  hr: (props: ComponentProps<'hr'>) => (
    <hr {...props} className={cn('my-8 border-border', props.className)} />
  ),
  table: (props: ComponentProps<'table'>) => (
    <div className="my-4 overflow-x-auto">
      <table {...props} className={cn('w-full border-collapse text-sm', props.className)} />
    </div>
  ),
  th: (props: ComponentProps<'th'>) => (
    <th
      {...props}
      className={cn('border border-border bg-muted px-3 py-2 text-left font-semibold', props.className)}
    />
  ),
  td: (props: ComponentProps<'td'>) => (
    <td {...props} className={cn('border border-border px-3 py-2 align-top', props.className)} />
  ),
};

/**
 * Scopes reading typography and gives the headings inside it a shared slug
 * registry. Wrap rendered markdown/MDX in it; pass {@link proseComponents} to the
 * renderer so the elements themselves pick up the map.
 */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  const registry = useRef<SlugRegistry>(new Map());
  return (
    <SlugRegistryContext.Provider value={registry.current}>
      <div className={cn('text-[15px] leading-relaxed text-foreground', className)}>{children}</div>
    </SlugRegistryContext.Provider>
  );
}
