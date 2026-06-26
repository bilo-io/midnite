import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PhaseDocsController } from './phase-docs.controller';
import {
  GithubUnavailableError,
  PhaseDocConflictError,
  type PhaseDocsService,
} from './phase-docs.service';

const REPO_WITH_SLUG = { id: 'r1', name: 'web', ownerRepo: 'acme/web' };
const REPO_NO_SLUG = { id: 'r2', name: 'local' };

function make(overrides?: {
  service?: Partial<PhaseDocsService>;
  repo?: unknown;
}) {
  const service = { list: vi.fn(), get: vi.fn(), ...overrides?.service } as unknown as PhaseDocsService;
  const projects = { getProject: vi.fn() } as never;
  const repos = { get: vi.fn().mockReturnValue(overrides?.repo ?? REPO_WITH_SLUG) } as never;
  return { controller: new PhaseDocsController(service, projects, repos), service, repos };
}

describe('PhaseDocsController', () => {
  it('400s when repoId is missing', async () => {
    const { controller } = make();
    await expect(controller.list('p1', undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the picked repo has no GitHub slug', async () => {
    const { controller } = make({ repo: REPO_NO_SLUG });
    await expect(controller.list('p1', 'r2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('400s a filename that tries to escape the phases dir', async () => {
    const { controller } = make();
    await expect(controller.get('p1', '../../secrets.md', 'r1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps a conflict from the service to 409', async () => {
    const { controller } = make({
      service: { list: vi.fn().mockRejectedValue(new PhaseDocConflictError('stale')) },
    });
    await expect(controller.list('p1', 'r1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps an unavailable GitHub to 502', async () => {
    const { controller } = make({
      service: { list: vi.fn().mockRejectedValue(new GithubUnavailableError('gh down')) },
    });
    await expect(controller.list('p1', 'r1')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('resolves the owner/repo slug and returns the doc list', async () => {
    const docs = [{ name: 'a.md', path: '.midnite/phases/a.md', sha: 's', content: '' }];
    const { controller, service } = make({ service: { list: vi.fn().mockResolvedValue(docs) } });
    await expect(controller.list('p1', 'r1')).resolves.toEqual({ docs });
    expect(service.list).toHaveBeenCalledWith('acme/web');
  });
});
