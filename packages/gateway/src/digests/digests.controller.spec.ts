import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Digest } from '@midnite/shared';

import { DigestsController } from './digests.controller';
import type { DigestsService } from './digests.service';

const digest = { id: 'd1', headline: 'hi', markdown: '# md' } as unknown as Digest;

function make(over: Partial<Record<'list' | 'get' | 'getMarkdown', unknown>> = {}) {
  const service = {
    list: over.list ?? vi.fn().mockReturnValue([{ id: 'd1' }]),
    get: over.get ?? vi.fn().mockReturnValue(digest),
    getMarkdown: over.getMarkdown ?? vi.fn().mockReturnValue('# md'),
  } as unknown as DigestsService;
  return { controller: new DigestsController(service), service };
}

/** A Fastify reply stub that records the header()/send() chain. */
function replyStub() {
  const headers: Record<string, string> = {};
  let body: unknown;
  const reply = {
    header(k: string, v: string) {
      headers[k.toLowerCase()] = v;
      return reply;
    },
    send(payload: unknown) {
      body = payload;
      return reply;
    },
  } as unknown as FastifyReply;
  return { reply, headers, get body() { return body; } };
}

describe('DigestsController', () => {
  it('lists recent digests', () => {
    const list = vi.fn().mockReturnValue([{ id: 'd1' }, { id: 'd2' }]);
    const { controller } = make({ list });
    expect(controller.list().digests).toHaveLength(2);
    expect(list).toHaveBeenCalledWith(undefined);
  });

  it('passes a parsed numeric limit through', () => {
    const list = vi.fn().mockReturnValue([]);
    const { controller } = make({ list });
    controller.list('5');
    expect(list).toHaveBeenCalledWith(5);
  });

  it('ignores a non-numeric limit (falls back to the default)', () => {
    const list = vi.fn().mockReturnValue([]);
    const { controller } = make({ list });
    controller.list('abc');
    expect(list).toHaveBeenCalledWith(undefined);
  });

  it('returns a single digest', () => {
    const { controller } = make();
    expect(controller.get('d1').digest.id).toBe('d1');
  });

  it('404s an unknown digest', () => {
    const { controller } = make({ get: () => undefined });
    expect(() => controller.get('nope')).toThrow(NotFoundException);
  });

  it('exports the stored markdown as an attachment', () => {
    const { controller } = make();
    const r = replyStub();
    controller.export('d1', r.reply, 'md');
    expect(r.headers['content-disposition']).toContain('digest-d1.md');
    expect(r.body).toBe('# md');
  });

  it('defaults the export format to md', () => {
    const { controller } = make();
    const r = replyStub();
    controller.export('d1', r.reply);
    expect(r.body).toBe('# md');
  });

  it('rejects a client-rendered format (pdf)', () => {
    const { controller } = make();
    const r = replyStub();
    expect(() => controller.export('d1', r.reply, 'pdf')).toThrow(BadRequestException);
  });

  it('rejects an unsupported format', () => {
    const { controller } = make();
    const r = replyStub();
    expect(() => controller.export('d1', r.reply, 'docx')).toThrow(BadRequestException);
  });

  it('404s export of an unknown digest', () => {
    const { controller } = make({ getMarkdown: () => undefined });
    const r = replyStub();
    expect(() => controller.export('nope', r.reply, 'md')).toThrow(NotFoundException);
  });
});
