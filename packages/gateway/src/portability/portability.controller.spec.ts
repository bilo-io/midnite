import { describe, expect, it, vi } from 'vitest';
import type { ImportPreview, ImportResult } from '@midnite/shared';
import { PortabilityController } from './portability.controller';
import type { PortabilityService } from './portability.service';
import type { PortabilityImportService } from './portability-import.service';

/** A fake Fastify multipart request: `isMultipart()` + an async `parts()` iterator. */
function multipartReq(parts: Array<Record<string, unknown>>) {
  return {
    isMultipart: () => true,
    async *parts() {
      for (const p of parts) yield p;
    },
  } as never;
}

const filePart = (fieldname: string, buf: Buffer) => ({
  type: 'file',
  fieldname,
  toBuffer: async () => buf,
});
const fieldPart = (fieldname: string, value: string) => ({ type: 'field', fieldname, value });

function controller(imp: Partial<PortabilityImportService>) {
  return new PortabilityController({} as PortabilityService, imp as PortabilityImportService);
}

describe('PortabilityController import', () => {
  it('feeds the uploaded "archive" file to preview', async () => {
    const preview = vi.fn((): ImportPreview => ({ manifest: {} as never, domainCounts: {}, conflicts: {}, compat: 'ok', importable: true }));
    const req = multipartReq([filePart('archive', Buffer.from('ZIP'))]);
    await controller({ preview }).importPreview(req);
    expect(preview).toHaveBeenCalledWith(Buffer.from('ZIP'));
  });

  it('parses the mode field and passes options to restore', async () => {
    const restore = vi.fn((): ImportResult => ({ ok: true, mode: 'replace', inserted: {}, skipped: {}, reindexed: true }));
    const req = multipartReq([fieldPart('mode', 'replace'), filePart('archive', Buffer.from('ZIP'))]);
    await controller({ restore }).import(req);
    expect(restore).toHaveBeenCalledWith(Buffer.from('ZIP'), expect.objectContaining({ mode: 'replace' }));
  });

  it('defaults the mode to merge when the field is absent', async () => {
    const restore = vi.fn((): ImportResult => ({ ok: true, mode: 'merge', inserted: {}, skipped: {}, reindexed: true }));
    await controller({ restore }).import(multipartReq([filePart('archive', Buffer.from('Z'))]));
    expect(restore).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ mode: 'merge' }));
  });

  it('rejects a request with no archive file part', async () => {
    await expect(controller({ preview: vi.fn() }).importPreview(multipartReq([fieldPart('mode', 'replace')]))).rejects.toThrow(/archive/);
  });

  it('rejects a non-multipart request', async () => {
    const req = { isMultipart: () => false } as never;
    await expect(controller({ preview: vi.fn() }).importPreview(req)).rejects.toThrow(/multipart/);
  });
});
