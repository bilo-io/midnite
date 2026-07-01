import type { DeckContent, DeckTheme, Slide, SlideFormat } from '@midnite/shared';

/** A fresh, empty slide of the given format with a unique id. */
export function newSlide(format: SlideFormat = 'md'): Slide {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `slide-${Date.now()}`,
    format,
    content: format === 'md' ? '# New slide\n\nEdit me.' : '<h1>New slide</h1>\n<p>Edit me.</p>',
  };
}

/** Move an array item from one index to another, returning a new array. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1) as [T];
  next.splice(to, 0, moved);
  return next;
}

/**
 * Build the innerHTML for reveal's `.slides` container. Markdown slides use
 * reveal's `data-markdown` template convention (the Markdown plugin parses them);
 * HTML slides are injected as-is after being run through `sanitize` (Decision:
 * HTML slides are sanitized before render). An empty deck renders a placeholder.
 */
export function buildSlidesHtml(slides: Slide[], sanitize: (html: string) => string): string {
  if (slides.length === 0) {
    return '<section><h2>Empty deck</h2><p>Add a slide to get started.</p></section>';
  }
  return slides
    .map((slide) => {
      const notes = slide.notes ? `<aside class="notes">${sanitize(slide.notes)}</aside>` : '';
      if (slide.format === 'md') {
        // reveal parses the raw markdown from the template script during init.
        return `<section data-markdown><script type="text/template">${escapeForTemplate(
          slide.content,
        )}</script>${notes}</section>`;
      }
      return `<section>${sanitize(slide.content)}${notes}</section>`;
    })
    .join('\n');
}

// A markdown body inside a <script type="text/template"> only needs its closing
// tag neutralised so it can't terminate the script element early.
function escapeForTemplate(md: string): string {
  return md.replace(/<\/script>/gi, '<\\/script>');
}

/** Inline CSS custom properties for a per-deck theme override (empty channels omitted). */
export function themeStyleVars(theme?: DeckTheme): Record<string, string> {
  const style: Record<string, string> = {};
  if (theme?.background) style['--background'] = theme.background;
  if (theme?.foreground) style['--foreground'] = theme.foreground;
  if (theme?.accent) style['--accent'] = theme.accent;
  return style;
}

/** Whether two deck bodies are equivalent (for dirty-state tracking). */
export function contentEquals(a: DeckContent, b: DeckContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
