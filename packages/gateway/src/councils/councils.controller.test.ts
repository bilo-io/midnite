import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply } from 'fastify';
import type { Council, CouncilMember, CouncilRun } from '@midnite/shared';
import {
  CouncilEmptyError,
  CouncilRunInProgressError,
  type CouncilRunnerService,
} from './council-runner.service';
import { CouncilDoesNotExistError, type CouncilsService } from './councils.service';
import type { CouncilsRepository } from './councils.repository';
import { CouncilsController } from './councils.controller';

const fakeCouncil = { id: 'c1', name: 'Board', members: [] } as unknown as Council;
const fakeMember = { id: 'm1', name: 'Alice' } as unknown as CouncilMember;
const fakeRun = { id: 'r1', councilId: 'c1', status: 'running' } as unknown as CouncilRun;

function build(overrides: {
  service?: Partial<Record<keyof CouncilsService, unknown>>;
  runner?: Partial<Record<keyof CouncilRunnerService, unknown>>;
  repo?: Partial<Record<keyof CouncilsRepository, unknown>>;
} = {}) {
  const service = {
    listCouncils: vi.fn(() => [fakeCouncil]),
    createCouncil: vi.fn(() => fakeCouncil),
    getCouncil: vi.fn(() => fakeCouncil),
    updateCouncil: vi.fn(() => fakeCouncil),
    deleteCouncil: vi.fn(),
    createMember: vi.fn(() => fakeMember),
    reorderMembers: vi.fn(() => fakeCouncil),
    updateMember: vi.fn(() => fakeMember),
    deleteMember: vi.fn(),
    exportRunMarkdown: vi.fn(() => ({ filename: 'run.md', markdown: '# Run' })),
    ...overrides.service,
  } as unknown as CouncilsService;
  const runner = {
    startRun: vi.fn(() => fakeRun),
    skipMember: vi.fn(() => fakeRun),
    retryMember: vi.fn(() => fakeRun),
    retrySynthesis: vi.fn(() => fakeRun),
    ...overrides.runner,
  } as unknown as CouncilRunnerService;
  const repo = {
    listRuns: vi.fn(() => [fakeRun]),
    hydrateRun: vi.fn(() => fakeRun),
    getRun: vi.fn(() => fakeRun),
    ...overrides.repo,
  } as unknown as CouncilsRepository;
  return { controller: new CouncilsController(service, runner, repo), service, runner, repo };
}

describe('CouncilsController — body/query validation (400)', () => {
  it('rejects creating a council with a blank name', () => {
    const { controller } = build();
    expect(() => controller.create({ name: '  ' })).toThrow(BadRequestException);
  });

  it('rejects starting a run with a blank prompt', () => {
    const { controller } = build();
    expect(() => controller.startRun('c1', { prompt: '' })).toThrow(BadRequestException);
  });

  it('rejects a reorder with an empty member list', () => {
    const { controller } = build();
    expect(() => controller.reorderMembers('c1', { memberIds: [] })).toThrow(BadRequestException);
  });

  it('rejects an export with an unknown format', () => {
    const { controller } = build();
    const reply = {} as FastifyReply;
    expect(() => controller.exportRun('c1', 'r1', reply, 'csv')).toThrow(BadRequestException);
  });

  it('rejects an export with a client-rendered format (pdf)', () => {
    const { controller } = build();
    const reply = {} as FastifyReply;
    expect(() => controller.exportRun('c1', 'r1', reply, 'pdf')).toThrow(BadRequestException);
  });
});

describe('CouncilsController — valid input delegates to the services', () => {
  it('creates with the parsed body and wraps the council', () => {
    const { controller, service } = build();
    expect(controller.create({ name: 'Board' })).toEqual({ council: fakeCouncil });
    expect(service.createCouncil).toHaveBeenCalledWith({ name: 'Board' });
  });

  it('starts a run with the parsed prompt', () => {
    const { controller, runner } = build();
    expect(controller.startRun('c1', { prompt: 'decide' })).toEqual({ run: fakeRun });
    expect(runner.startRun).toHaveBeenCalledWith('c1', 'decide', undefined);
  });

  it('streams a markdown export with attachment headers', () => {
    const { controller, service } = build();
    const header = vi.fn();
    const send = vi.fn();
    const reply = { header, send } as unknown as FastifyReply;
    header.mockReturnValue(reply);
    send.mockReturnValue(reply);
    controller.exportRun('c1', 'r1', reply, 'md');
    expect(service.exportRunMarkdown).toHaveBeenCalledWith('c1', 'r1');
    expect(header).toHaveBeenCalledWith('content-disposition', 'attachment; filename="run.md"');
    expect(send).toHaveBeenCalledWith('# Run');
  });

  it('returns { ok: true } after deleting a council', () => {
    const { controller, service } = build();
    expect(controller.remove('c1')).toEqual({ ok: true });
    expect(service.deleteCouncil).toHaveBeenCalledWith('c1');
  });
});

describe('CouncilsController — domain errors map to HTTP status', () => {
  it('maps CouncilDoesNotExistError to 404 on GET :id', () => {
    const { controller } = build({
      service: {
        getCouncil: vi.fn(() => {
          throw new CouncilDoesNotExistError('c9');
        }),
      },
    });
    expect(() => controller.get('c9')).toThrow(NotFoundException);
  });

  it('maps CouncilEmptyError to 400 when starting a run', () => {
    const { controller } = build({
      runner: {
        startRun: vi.fn(() => {
          throw new CouncilEmptyError('c1');
        }),
      },
    });
    expect(() => controller.startRun('c1', { prompt: 'go' })).toThrow(BadRequestException);
  });

  it('maps CouncilRunInProgressError to 409 when starting a run', () => {
    const { controller } = build({
      runner: {
        startRun: vi.fn(() => {
          throw new CouncilRunInProgressError('c1');
        }),
      },
    });
    expect(() => controller.startRun('c1', { prompt: 'go' })).toThrow(ConflictException);
  });

  it('404s GET run when the run belongs to a different council', () => {
    const { controller } = build({
      repo: { getRun: vi.fn(() => ({ ...fakeRun, councilId: 'other' })) },
    });
    expect(() => controller.getRun('c1', 'r1')).toThrow(NotFoundException);
  });
});
