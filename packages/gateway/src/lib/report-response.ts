import type { FastifyReply } from 'fastify';
import { REPORT_CONTENT_TYPE } from '@midnite/shared';

/**
 * Send a server-rendered markdown report as a downloadable attachment, setting
 * the shared `REPORT_CONTENT_TYPE` + a `Content-Disposition` filename uniformly.
 * The one place every domain export route (councils, tasks, …) writes the
 * response, so they stay byte-identical (Phase 18 Theme D — generalize & reuse).
 */
export function sendMarkdownReport(reply: FastifyReply, filename: string, markdown: string): void {
  void reply
    .header('content-type', REPORT_CONTENT_TYPE.md)
    .header('content-disposition', `attachment; filename="${filename}"`)
    .send(markdown);
}
