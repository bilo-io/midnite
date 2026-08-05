import { createRoot } from 'react-dom/client';
import { LocaleProvider } from '@midnite/shell';
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
 * `LocaleProvider`; with no `initialLocale` the provider resolves the persisted
 * preference itself, so an export inherits the reader's language.
 */
export async function captureMarkdownHtml(markdown: string): Promise<string> {
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(
    <LocaleProvider catalogs={CATALOGS}>
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
