import { describe, expect, it } from 'vitest';
import {
  GithubUnavailableError,
  PhaseDocConflictError,
  PhaseDocNotFoundError,
  PhaseDocsService,
} from './phase-docs.service';

type Call = { args: string[]; body?: Record<string, string> };

/** Stubs the raw `gh` seam: records calls, replays canned stdout or throws. */
class FakePhaseDocsService extends PhaseDocsService {
  readonly calls: Call[] = [];
  next: ((args: string[], body?: Record<string, string>) => string) = () => '{}';

  protected override runGh(args: string[], body?: Record<string, string>): Promise<string> {
    this.calls.push({ args, body });
    try {
      return Promise.resolve(this.next(args, body));
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

const REPO = 'octocat/hello-world';

function contentEntry(name: string, content: string) {
  return {
    type: 'file',
    name,
    path: `.midnite/phases/${name}`,
    sha: `sha-${name}`,
    encoding: 'base64',
    content: Buffer.from(content, 'utf8').toString('base64'),
  };
}

describe('PhaseDocsService', () => {
  it('lists only markdown files under .midnite/phases', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () =>
      JSON.stringify([
        { type: 'file', name: 'a.md', path: '.midnite/phases/a.md', sha: 's1' },
        { type: 'file', name: 'notes.txt', path: '.midnite/phases/notes.txt', sha: 's2' },
        { type: 'dir', name: 'sub', path: '.midnite/phases/sub', sha: 's3' },
      ]);

    const docs = await svc.list(REPO);

    expect(docs).toEqual([{ name: 'a.md', path: '.midnite/phases/a.md', sha: 's1', content: '' }]);
    expect(svc.calls[0]?.args).toEqual(['api', `repos/${REPO}/contents/.midnite/phases`]);
  });

  it('returns an empty list when the phases dir does not exist (404)', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => {
      throw Object.assign(new Error('not found'), { stderr: 'gh: HTTP 404 Not Found' });
    };
    await expect(svc.list(REPO)).resolves.toEqual([]);
  });

  it('decodes base64 content on get', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => JSON.stringify(contentEntry('plan.md', '# Plan\nhello'));
    const doc = await svc.get(REPO, 'plan.md');
    expect(doc.content).toBe('# Plan\nhello');
    expect(doc.sha).toBe('sha-plan.md');
  });

  it('creates a new doc with a PUT and no sha, base64-encoding the body', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => JSON.stringify({ content: contentEntry('auth-revamp.md', 'body') });

    const doc = await svc.create(REPO, 'Auth revamp', 'body');

    const call = svc.calls[0]!;
    expect(call.args).toEqual([
      'api',
      '--method',
      'PUT',
      `repos/${REPO}/contents/.midnite/phases/auth-revamp.md`,
    ]);
    expect(call.body?.sha).toBeUndefined();
    expect(Buffer.from(call.body?.content ?? '', 'base64').toString('utf8')).toBe('body');
    expect(doc.name).toBe('auth-revamp.md');
    expect(doc.content).toBe('body');
  });

  it('updates an existing doc with a PUT that echoes the sha', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => JSON.stringify({ content: contentEntry('auth-revamp.md', 'new') });

    await svc.update(REPO, 'auth-revamp.md', 'new', 'sha-123');

    expect(svc.calls[0]!.body?.sha).toBe('sha-123');
  });

  it('deletes with a DELETE carrying the sha and a message', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => '{}';
    await svc.delete(REPO, 'auth-revamp.md', 'sha-9');
    const call = svc.calls[0]!;
    expect(call.args).toEqual([
      'api',
      '--method',
      'DELETE',
      `repos/${REPO}/contents/.midnite/phases/auth-revamp.md`,
    ]);
    expect(call.body).toMatchObject({ sha: 'sha-9' });
    expect(call.body?.message).toContain('delete');
  });

  it('maps a stale-SHA conflict to PhaseDocConflictError', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => {
      throw Object.assign(new Error('conflict'), {
        stderr: 'gh: HTTP 409: sha does not match',
      });
    };
    await expect(svc.update(REPO, 'a.md', 'x', 'old')).rejects.toBeInstanceOf(
      PhaseDocConflictError,
    );
  });

  it('maps a 404 on get to PhaseDocNotFoundError', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => {
      throw Object.assign(new Error('nope'), { stderr: 'gh: HTTP 404 Not Found' });
    };
    await expect(svc.get(REPO, 'missing.md')).rejects.toBeInstanceOf(PhaseDocNotFoundError);
  });

  it('maps an unauthenticated/unknown gh failure to GithubUnavailableError', async () => {
    const svc = new FakePhaseDocsService();
    svc.next = () => {
      throw Object.assign(new Error('boom'), { stderr: 'gh auth login required' });
    };
    await expect(svc.list(REPO)).rejects.toBeInstanceOf(GithubUnavailableError);
  });
});
