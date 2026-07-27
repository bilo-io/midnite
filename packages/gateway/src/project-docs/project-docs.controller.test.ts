import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { ProjectDocsController } from './project-docs.controller';

function makeService() {
  return {
    listDocs: vi.fn(() => [{ id: 'd1' }]),
    createDoc: vi.fn((_p: string, _req: unknown) => ({ id: 'd1' })),
    updateDoc: vi.fn(() => ({ id: 'd1' })),
    removeDoc: vi.fn(),
    generateDoc: vi.fn(async () => ({ id: 'd1', content: 'filled' })),
  };
}

let service: ReturnType<typeof makeService>;
let ctrl: ProjectDocsController;

beforeEach(() => {
  service = makeService();
  ctrl = new ProjectDocsController(service as never);
});

describe('ProjectDocsController', () => {
  it('list wraps the docs in items', () => {
    expect(ctrl.list('p1')).toEqual({ items: [{ id: 'd1' }] });
    expect(service.listDocs).toHaveBeenCalledWith('p1');
  });

  it('create 400s on an invalid body', () => {
    expect(() => ctrl.create('p1', { name: 123 })).toThrow(BadRequestException);
    expect(service.createDoc).not.toHaveBeenCalled();
  });

  it('create passes the parsed body', () => {
    expect(ctrl.create('p1', { templateId: 'prd' })).toEqual({ doc: { id: 'd1' } });
    expect(service.createDoc).toHaveBeenCalledWith('p1', expect.objectContaining({ templateId: 'prd' }));
  });

  it('update 400s on an invalid body', () => {
    expect(() => ctrl.update('d1', { content: 123 })).toThrow(BadRequestException);
  });

  it('update passes the parsed body', () => {
    expect(ctrl.update('d1', { content: 'x' })).toEqual({ doc: { id: 'd1' } });
    expect(service.updateDoc).toHaveBeenCalledWith('d1', expect.objectContaining({ content: 'x' }));
  });

  it('remove delegates and returns ok', () => {
    expect(ctrl.remove('d1')).toEqual({ ok: true });
    expect(service.removeDoc).toHaveBeenCalledWith('d1');
  });

  it('generate delegates and wraps the doc', async () => {
    await expect(ctrl.generate('d1')).resolves.toEqual({ doc: { id: 'd1', content: 'filled' } });
    expect(service.generateDoc).toHaveBeenCalledWith('d1');
  });
});
