import { describe, expect, it, vi } from 'vitest';
import { fetchGithubPrDiff, parseUnifiedDiff, type ExecFileFn } from './github-diff';

const PR_URL = 'https://github.com/bilo-io/midnite/pull/42';

function okResponse(body: string): Response {
  return { ok: true, status: 200, text: async () => body } as unknown as Response;
}
function errResponse(status: number): Response {
  return { ok: false, status, text: async () => '' } as unknown as Response;
}

describe('fetchGithubPrDiff — fetch ladder', () => {
  it('uses the authenticated REST path first when a token is supplied', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse('diff --git a/x b/x\n'));
    const execFileImpl = vi.fn();

    const out = await fetchGithubPrDiff(PR_URL, {
      token: 'ghp_test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      execFileImpl: execFileImpl as unknown as ExecFileFn,
    });

    expect(out).toBe('diff --git a/x b/x\n');
    expect(execFileImpl).not.toHaveBeenCalled();
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer ghp_test');
  });

  it('falls back to `gh pr diff` when there is no token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errResponse(404));
    const execFileImpl = vi.fn().mockResolvedValue({ stdout: 'diff --git a/y b/y\n' });

    const out = await fetchGithubPrDiff(PR_URL, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      execFileImpl: execFileImpl as unknown as ExecFileFn,
    });

    expect(out).toBe('diff --git a/y b/y\n');
    expect(execFileImpl).toHaveBeenCalledWith('gh', ['pr', 'diff', PR_URL], expect.any(Object));
  });

  it('falls back to anonymous REST when gh fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse('diff --git a/z b/z\n'));
    const execFileImpl = vi.fn().mockRejectedValue(new Error('gh: not found'));

    const out = await fetchGithubPrDiff(PR_URL, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      execFileImpl: execFileImpl as unknown as ExecFileFn,
    });

    expect(out).toBe('diff --git a/z b/z\n');
  });

  it('fails open (null) when every source fails', async () => {
    const out = await fetchGithubPrDiff(PR_URL, {
      fetchImpl: vi.fn().mockResolvedValue(errResponse(500)) as unknown as typeof fetch,
      execFileImpl: vi.fn().mockRejectedValue(new Error('nope')) as unknown as ExecFileFn,
    });
    expect(out).toBeNull();
  });

  it('returns null for an unparseable PR URL without hitting the network', async () => {
    const fetchImpl = vi.fn();
    const out = await fetchGithubPrDiff('https://example.com/not-a-pr', {
      token: 't',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('parseUnifiedDiff — structure', () => {
  it('parses a modified file with hunks + add/del counts', () => {
    const raw = [
      'diff --git a/src/foo.ts b/src/foo.ts',
      'index 111..222 100644',
      '--- a/src/foo.ts',
      '+++ b/src/foo.ts',
      '@@ -1,3 +1,4 @@ export function foo() {',
      ' const a = 1;',
      '-const b = 2;',
      '+const b = 3;',
      '+const c = 4;',
      ' return a;',
      '',
    ].join('\n');

    const { files, additions, deletions, truncated } = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    const f = files[0]!;
    expect(f.path).toBe('src/foo.ts');
    expect(f.status).toBe('modified');
    expect(f.additions).toBe(2);
    expect(f.deletions).toBe(1);
    expect(f.hunks).toHaveLength(1);
    expect(f.hunks[0]!.oldStart).toBe(1);
    expect(f.hunks[0]!.newLines).toBe(4);
    // context/add/del line-number bookkeeping
    const add = f.hunks[0]!.lines.find((l) => l.kind === 'add' && l.content === 'const c = 4;')!;
    expect(add.newLine).toBeGreaterThan(0);
    expect(additions).toBe(2);
    expect(deletions).toBe(1);
    expect(truncated).toBe(false);
  });

  it('does not emit a phantom trailing context line from the block newline', () => {
    // Block ends with a newline → split('\n') yields a trailing '' that must not
    // be counted as a context line (would inflate counts + line numbers).
    const raw = 'diff --git a/f.ts b/f.ts\n--- a/f.ts\n+++ b/f.ts\n@@ -1,2 +1,2 @@\n a\n-b\n+c\n';
    const hunk = parseUnifiedDiff(raw).files[0]!.hunks[0]!;
    expect(hunk.lines).toHaveLength(3); // context ' a', del '-b', add '+c' — no 4th
    expect(hunk.lines.map((l) => l.kind)).toEqual(['context', 'del', 'add']);
  });

  it('classifies added, removed and renamed files', () => {
    const raw = [
      'diff --git a/new.ts b/new.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/new.ts',
      '@@ -0,0 +1,1 @@',
      '+hello',
      'diff --git a/gone.ts b/gone.ts',
      'deleted file mode 100644',
      '--- a/gone.ts',
      '+++ /dev/null',
      '@@ -1,1 +0,0 @@',
      '-bye',
      'diff --git a/old-name.ts b/new-name.ts',
      'similarity index 100%',
      'rename from old-name.ts',
      'rename to new-name.ts',
      '',
    ].join('\n');

    const byPath = Object.fromEntries(parseUnifiedDiff(raw).files.map((f) => [f.path, f]));
    expect(byPath['new.ts']!.status).toBe('added');
    expect(byPath['gone.ts']!.status).toBe('removed');
    expect(byPath['new-name.ts']!.status).toBe('renamed');
    expect(byPath['new-name.ts']!.oldPath).toBe('old-name.ts');
  });

  it('flags binary files without hunks', () => {
    const raw = [
      'diff --git a/logo.png b/logo.png',
      'index 111..222 100644',
      'Binary files a/logo.png and b/logo.png differ',
      '',
    ].join('\n');
    const f = parseUnifiedDiff(raw).files[0]!;
    expect(f.binary).toBe(true);
    expect(f.hunks).toHaveLength(0);
  });

  it('drops whole files past the byte budget and reports them (no silent truncation)', () => {
    const big = (name: string) =>
      [`diff --git a/${name} b/${name}`, '--- a/' + name, '+++ b/' + name, '@@ -1,1 +1,1 @@', '-a', '+' + 'x'.repeat(200)].join('\n');
    const raw = [big('a.ts'), big('b.ts'), big('c.ts')].join('\n');

    const parsed = parseUnifiedDiff(raw, 250); // fits ~1 file
    expect(parsed.truncated).toBe(true);
    expect(parsed.files.length).toBeGreaterThanOrEqual(1);
    expect(parsed.files.length).toBeLessThan(3);
    expect(parsed.hiddenFileCount).toBe(3 - parsed.files.length);
    expect(parsed.hiddenFiles).toContain('c.ts');
  });

  it('always includes the first file even if it alone exceeds the budget', () => {
    const raw = ['diff --git a/huge.ts b/huge.ts', '--- a/huge.ts', '+++ b/huge.ts', '@@ -1,1 +1,1 @@', '+' + 'x'.repeat(500)].join('\n');
    const parsed = parseUnifiedDiff(raw, 10);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.truncated).toBe(false);
  });

  it('returns an empty diff for empty input', () => {
    expect(parseUnifiedDiff('')).toEqual({
      files: [],
      additions: 0,
      deletions: 0,
      truncated: false,
      hiddenFileCount: 0,
      hiddenFiles: [],
    });
  });
});
