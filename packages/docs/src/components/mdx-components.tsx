import type { ComponentProps } from 'react';

import { cn } from '@midnite/ui';

// Maps MDX prose elements (the lowercase h1/p/code/… the markdown compiles to)
// onto the design system's type + spacing + token classes, so authored docs read
// as one site with the live component examples. Supplied to every page via the
// MDXProvider in app.tsx. Capitalised components an MDX file imports directly
// (e.g. <Button/>) are unaffected — only prose elements are themed here.
export const mdxComponents = {
  h1: (props: ComponentProps<'h1'>) => (
    <h1 {...props} className={cn('mt-2 mb-4 text-3xl font-semibold tracking-tight', props.className)} />
  ),
  // h2/h3 carry rehype-slug ids and are the on-page TOC's anchor targets; the
  // scroll-margin keeps an anchored heading clear of the sticky header.
  h2: (props: ComponentProps<'h2'>) => (
    <h2
      {...props}
      className={cn(
        'mt-10 mb-3 scroll-mt-20 border-b border-border pb-1.5 text-xl font-semibold tracking-tight',
        props.className,
      )}
    />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 {...props} className={cn('mt-6 mb-2 scroll-mt-20 text-base font-semibold', props.className)} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p {...props} className={cn('my-4 leading-7 text-foreground/90', props.className)} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a
      {...props}
      className={cn('font-medium text-foreground underline underline-offset-4 hover:text-foreground/70', props.className)}
    />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul {...props} className={cn('my-4 ml-6 list-disc space-y-1.5 text-foreground/90', props.className)} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol {...props} className={cn('my-4 ml-6 list-decimal space-y-1.5 text-foreground/90', props.className)} />
  ),
  li: (props: ComponentProps<'li'>) => <li {...props} className={cn('leading-7', props.className)} />,
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote
      {...props}
      className={cn('my-4 border-l-2 border-border pl-4 italic text-muted-foreground', props.className)}
    />
  ),
  code: (props: ComponentProps<'code'>) => (
    <code
      {...props}
      className={cn(
        'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground',
        props.className,
      )}
    />
  ),
  // Fenced code blocks: own the background + scroll, and neutralise the inline
  // <code> chip styling for the code nested inside.
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
  hr: (props: ComponentProps<'hr'>) => <hr {...props} className={cn('my-8 border-border', props.className)} />,
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
