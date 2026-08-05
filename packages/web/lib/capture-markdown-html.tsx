import { createRoot } from 'react-dom/client';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';
import { MarkdownPreview } from '@/components/markdown-preview';
import { CATALOGS } from '@/i18n/messages';

/**
 * Render markdown to a sanitized HTML string by mounting `<MarkdownPreview>`
 * (react-markdown — same renderer the app uses on screen) into a detached node
 * and capturing its `innerHTML`. Shared by every HTML export (councils today;
 * tasks/projects/runs as Phase 18 lands) so the offline document matches the
 * in-app rendering and inherits its sanitization.
 *
 * DOM-dependent and async (createRoot commits off the current tick), so it lives
 * apart from the pure `report-html-export.ts` string builders.
 *
 * The root is **detached**, so it sits outside the app's provider tree — and
 * `MarkdownPreview` reads `common.editor.taskItem.*` for the accessible name of GFM
 * task-list checkboxes (Phase 82 Theme D). It therefore mounts its own
 * `LocaleProvider`.
 *
 * `locale` must be passed by the caller (which *is* inside the tree, so it has
 * `useLocale()`). Letting the provider resolve the preference itself would be a race:
 * it initialises to `DEFAULT_LOCALE` and applies the stored locale in a mount effect,
 * but the capture loop below exits on the first non-empty `innerHTML` — usually the
 * pre-effect commit. Passing it in makes the exported document deterministic.
 */
export async function captureMarkdownHtml(markdown: string, locale?: Locale): Promise<string> {
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(
    <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
      <MarkdownPreview content={markdown} />
    </LocaleProvider>,
  );
  // createRoot commits asynchronously — poll briefly until it has rendered.
  for (let i = 0; i < 20 && container.innerHTML === ''; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const html = container.innerHTML;
  root.unmount();
  return html;
}
