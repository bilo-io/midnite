import { z } from 'zod';

// A small, reusable contract for exporting a domain artifact (a council run, a
// project, a task thread, …) as a portable document. Markdown is built on the
// server (a pure `toMarkdown()` serializer per domain); PDF is rendered on the
// client by printing the same content (Electron `printToPDF` or the browser
// print dialog) — never server-side, so no headless-Chrome / puppeteer / jsPDF
// dependency. The format enum is the single source of truth shared by the
// gateway export controller, the typed API client, and the web `ExportMenu`.

/** The portable formats a report can be exported as. */
export const REPORT_FORMATS = ['md', 'pdf'] as const;
export const ReportFormatSchema = z.enum(REPORT_FORMATS);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

/** Only `md` is built on the gateway; `pdf` is rendered client-side from the markdown. */
export const SERVER_RENDERED_REPORT_FORMATS = ['md'] as const satisfies readonly ReportFormat[];

/** Whether the gateway builds this format (vs. the client rendering it from markdown). */
export function isServerRenderedReportFormat(format: ReportFormat): boolean {
  return (SERVER_RENDERED_REPORT_FORMATS as readonly ReportFormat[]).includes(format);
}

/** MIME type the gateway serves a server-rendered report as. */
export const REPORT_CONTENT_TYPE: Record<(typeof SERVER_RENDERED_REPORT_FORMATS)[number], string> = {
  md: 'text/markdown; charset=utf-8',
};
