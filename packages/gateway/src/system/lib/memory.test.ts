import { describe, expect, it } from 'vitest';

import { fromAvailable, parseMemInfo, parseVmStat } from './memory';

const GIB = 1024 ** 3;

// Real `vm_stat` output from a 16 GiB Apple Silicon Mac, captured while the
// machine reported 84% used in Activity Monitor and 99.4% via `os.freemem()`
// — the exact reading behind bilo-io/midnite-app#3.
const VM_STAT_DARWIN = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                3872.
Pages active:                            193513.
Pages inactive:                          191285.
Pages speculative:                         1062.
Pages throttled:                              0.
Pages wired down:                        134341.
Pages purgeable:                             21.
"Translation faults":                2245634877.
Pages copy-on-write:                   65491415.
Pages zero filled:                    623297087.
Pages reactivated:                    963873538.
Pages purged:                          16599715.
File-backed pages:                       119039.
Anonymous pages:                         266821.
Pages stored in compressor:             2125305.
Pages occupied by compressor:            482950.
Decompressions:                       895088495.
Compressions:                         973414233.
Pageins:                               28907002.
Pageouts:                                327338.
Swapins:                               23370678.
Swapouts:                              26728378.
`;

const DARWIN_TOTAL = 17179869184; // sysctl hw.memsize on that host

describe('parseVmStat', () => {
  it('reports what Activity Monitor calls "Memory Used": app + wired + compressed', () => {
    const sample = parseVmStat(VM_STAT_DARWIN, DARWIN_TOTAL);

    // (anonymous 266821 - purgeable 21 + wired 134341 + compressor 482950) * 16384
    expect(sample?.usedBytes).toBe(14484946944);
    expect(sample?.usagePct).toBe(84.3);
    // Everything the OS can hand back without paging — chiefly the file cache
    // that `os.freemem()` refuses to count.
    expect(sample?.availableBytes).toBe(DARWIN_TOTAL - 14484946944);
    expect(sample?.totalBytes).toBe(DARWIN_TOTAL);
  });

  it('partitions the total exactly, so used + available === total', () => {
    const sample = parseVmStat(VM_STAT_DARWIN, DARWIN_TOTAL);
    expect((sample?.usedBytes ?? 0) + (sample?.availableBytes ?? 0)).toBe(DARWIN_TOTAL);
  });

  it('honours the reported page size rather than assuming 4 KiB', () => {
    const asFourKiB = VM_STAT_DARWIN.replace('page size of 16384 bytes', 'page size of 4096 bytes');
    const sample = parseVmStat(asFourKiB, DARWIN_TOTAL);
    expect(sample?.usedBytes).toBe(14484946944 / 4);
  });

  it('returns null when the page-size header is missing — guessing it would be worse', () => {
    const headerless = VM_STAT_DARWIN.split('\n').slice(1).join('\n');
    expect(parseVmStat(headerless, DARWIN_TOTAL)).toBeNull();
  });

  it('returns null when a counter it needs is absent', () => {
    const noWired = VM_STAT_DARWIN.replace(/^Pages wired down:.*$/m, '');
    expect(parseVmStat(noWired, DARWIN_TOTAL)).toBeNull();
  });

  it('returns null on unrelated output', () => {
    expect(parseVmStat('command not found', DARWIN_TOTAL)).toBeNull();
  });

  it('clamps a used figure that would exceed the reported total', () => {
    // A total smaller than the page accounting (a VM whose hw.memsize lies)
    // must not produce usagePct > 100 and break the zod contract.
    const sample = parseVmStat(VM_STAT_DARWIN, 8 * GIB);
    expect(sample?.usedBytes).toBe(8 * GIB);
    expect(sample?.availableBytes).toBe(0);
    expect(sample?.usagePct).toBe(100);
  });
});

describe('parseMemInfo', () => {
  it('prefers MemAvailable — the kernel\'s own reclaimable estimate', () => {
    const sample = parseMemInfo(
      ['MemTotal:       16384000 kB', 'MemFree:          500000 kB', 'MemAvailable:    8192000 kB', 'Buffers:          200000 kB'].join('\n'),
    );

    expect(sample?.totalBytes).toBe(16384000 * 1024);
    expect(sample?.availableBytes).toBe(8192000 * 1024);
    expect(sample?.usedBytes).toBe(16384000 * 1024 - 8192000 * 1024);
    expect(sample?.usagePct).toBe(50);
  });

  it('falls back to free + buffers + cached on kernels predating MemAvailable', () => {
    const sample = parseMemInfo(
      ['MemTotal:       16384000 kB', 'MemFree:         1024000 kB', 'Buffers:          512000 kB', 'Cached:          2048000 kB'].join('\n'),
    );

    expect(sample?.availableBytes).toBe((1024000 + 512000 + 2048000) * 1024);
    expect(sample?.usagePct).toBe(78.1);
  });

  it('returns null without a MemTotal to divide by', () => {
    expect(parseMemInfo('MemFree: 1024 kB')).toBeNull();
    expect(parseMemInfo('')).toBeNull();
  });
});

describe('fromAvailable', () => {
  it('derives used and the percentage from an available figure', () => {
    expect(fromAvailable(16 * GIB, 4 * GIB)).toEqual({
      totalBytes: 16 * GIB,
      usedBytes: 12 * GIB,
      availableBytes: 4 * GIB,
      usagePct: 75,
    });
  });

  it('clamps nonsense inputs into the contract\'s 0–100 range', () => {
    expect(fromAvailable(16 * GIB, -1).usagePct).toBe(100);
    expect(fromAvailable(16 * GIB, 999 * GIB).usagePct).toBe(0);
    expect(fromAvailable(0, 0).usagePct).toBe(0);
  });
});
