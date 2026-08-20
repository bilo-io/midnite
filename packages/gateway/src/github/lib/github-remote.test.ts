import { describe, expect, it } from 'vitest';

import {
  normalizeGitRemote,
  ownerRepoKey,
  parseGitConfigRemotes,
  pickRemoteUrl,
} from './github-remote';

describe('normalizeGitRemote', () => {
  // The whole point of this helper is that the same repo spelled six different ways in
  // six different checkouts still matches one GitHub entry, so the matrix is the test.
  it.each([
    ['git@github.com:bilo-io/midnite.git', 'bilo-io/midnite'],
    ['git@github.com:bilo-io/midnite', 'bilo-io/midnite'],
    ['ssh://git@github.com/bilo-io/midnite.git', 'bilo-io/midnite'],
    ['ssh://git@ssh.github.com:443/bilo-io/midnite.git', 'bilo-io/midnite'],
    ['https://github.com/bilo-io/midnite.git', 'bilo-io/midnite'],
    ['https://github.com/bilo-io/midnite', 'bilo-io/midnite'],
    ['https://github.com/bilo-io/midnite/', 'bilo-io/midnite'],
    ['https://www.github.com/bilo-io/midnite', 'bilo-io/midnite'],
    ['git://github.com/bilo-io/midnite.git', 'bilo-io/midnite'],
    ['  https://github.com/bilo-io/midnite.git  ', 'bilo-io/midnite'],
  ])('normalises %s', (remote, expected) => {
    expect(normalizeGitRemote(remote)).toBe(expected);
  });

  it('keeps a credential prefix out of the slug', () => {
    // A token-embedded https remote is common in CI checkouts; the token is in the
    // userinfo component, so the slug must be unaffected by it.
    expect(normalizeGitRemote('https://user:ghp_secret@github.com/bilo-io/midnite.git')).toBe(
      'bilo-io/midnite',
    );
  });

  it('preserves the display casing but folds the lookup key', () => {
    expect(normalizeGitRemote('git@github.com:Bilo-IO/Midnite.git')).toBe('Bilo-IO/Midnite');
    expect(ownerRepoKey('Bilo-IO/Midnite')).toBe('bilo-io/midnite');
  });

  it.each([
    ['git@gitlab.com:bilo-io/midnite.git', 'a non-GitHub host'],
    ['https://git.example.com/bilo-io/midnite.git', 'a self-hosted forge'],
    ['https://github.example.com/bilo-io/midnite', 'a lookalike host'],
    ['https://github.com/bilo-io', 'only one path segment'],
    ['https://github.com/bilo-io/midnite/tree/main', 'more than two path segments'],
    ['file:///Users/me/midnite', 'a non-network protocol'],
    ['not a url at all', 'unparseable input'],
    ['', 'an empty string'],
  ])('rejects %s (%s)', (remote) => {
    expect(normalizeGitRemote(remote)).toBeNull();
  });

  it('rejects GitHub Enterprise Server hosts (out of scope this phase)', () => {
    expect(normalizeGitRemote('git@github.acme-corp.com:team/app.git')).toBeNull();
  });
});

describe('parseGitConfigRemotes', () => {
  const CONFIG = `[core]
\trepositoryformatversion = 0
\tbare = false
[remote "origin"]
\turl = git@github.com:bilo-io/midnite.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
[remote "upstream"]
\turl = https://github.com/upstream-org/midnite.git
[branch "main"]
\tremote = origin
`;

  it('reads every remote with its url', () => {
    const remotes = parseGitConfigRemotes(CONFIG);
    expect(remotes.get('origin')).toBe('git@github.com:bilo-io/midnite.git');
    expect(remotes.get('upstream')).toBe('https://github.com/upstream-org/midnite.git');
    expect(remotes.size).toBe(2);
  });

  it('does not attribute a later section\'s url to the last remote', () => {
    // `[branch "main"]` follows a remote block; a naive parser that only tracks "the
    // last section header I saw was a remote" would swallow keys from it.
    const remotes = parseGitConfigRemotes(`[remote "origin"]
\turl = git@github.com:a/b.git
[lfs "https://github.com/a/b.git/info/lfs"]
\turl = https://example.invalid/wrong.git
`);
    expect(remotes.get('origin')).toBe('git@github.com:a/b.git');
    expect(remotes.size).toBe(1);
  });

  it('ignores comments and tolerates loose whitespace', () => {
    const remotes = parseGitConfigRemotes(`  [remote  "origin"]
# url = https://example.invalid/commented-out.git
;   url = https://example.invalid/also-commented.git
   url   =   git@github.com:a/b.git
`);
    expect(remotes.get('origin')).toBe('git@github.com:a/b.git');
  });

  it('returns an empty map for a config with no remotes', () => {
    expect(parseGitConfigRemotes('[core]\n\tbare = false\n').size).toBe(0);
  });

  it('keeps the first url when a remote declares several', () => {
    // Multiple `url =` lines in one remote are legal (git uses the last for push, the
    // first for fetch); either is the same repo, so first-wins is stable and enough.
    const remotes = parseGitConfigRemotes(`[remote "origin"]
\turl = git@github.com:a/b.git
\turl = git@github.com:a/b-mirror.git
`);
    expect(remotes.get('origin')).toBe('git@github.com:a/b.git');
  });
});

describe('pickRemoteUrl', () => {
  it('prefers origin over upstream', () => {
    const remotes = new Map([
      ['upstream', 'https://github.com/upstream-org/app.git'],
      ['origin', 'git@github.com:me/app.git'],
    ]);
    expect(pickRemoteUrl(remotes)).toBe('git@github.com:me/app.git');
  });

  it('falls back to upstream when there is no origin', () => {
    const remotes = new Map([['upstream', 'https://github.com/upstream-org/app.git']]);
    expect(pickRemoteUrl(remotes)).toBe('https://github.com/upstream-org/app.git');
  });

  it('falls back to the first declared remote when neither is present', () => {
    const remotes = new Map([['fork', 'git@github.com:me/app.git']]);
    expect(pickRemoteUrl(remotes)).toBe('git@github.com:me/app.git');
  });

  it('returns undefined for no remotes', () => {
    expect(pickRemoteUrl(new Map())).toBeUndefined();
  });
});
