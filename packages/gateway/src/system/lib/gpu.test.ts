import { describe, expect, it, vi } from 'vitest';

import { createGpuProbe, parseIoregAccelerator, parseNvidiaSmi, parseSysfsBusyPercent } from './gpu';

// A trimmed but faithful excerpt of `ioreg -r -d 1 -w 0 -c IOAccelerator` on an
// Apple Silicon host: the flattened PerformanceStatistics dictionary (no spaces
// around `=`) plus the device-level `model` property (spaces around `=`). The
// spacing difference is real and the parser has to cope with both.
const IOREG_DARWIN = `+-o AGXAcceleratorG14X  <class AGXAcceleratorG14X, id 0x1000004c8, registered, matched, active, busy 0 (313 ms), retain 61>
    {
      "IOMatchedAtBoot" = Yes
      "vendor-id" = <6b100000>
      "PerformanceStatistics" = {"In use system memory (driver)"=0,"Alloc system memory"=3375366144,"Tiler Utilization %"=74,"recoveryCount"=0,"Renderer Utilization %"=74,"Device Utilization %"=74,"In use system memory"=853360640}
      "IOSourceVersion" = "329.2"
      "model" = "Apple M2 Pro"
      "IOClass" = "AGXAcceleratorG14X"
    }
`;

describe('parseIoregAccelerator', () => {
  it('reads utilization, adapter name and in-use memory', () => {
    expect(parseIoregAccelerator(IOREG_DARWIN)).toEqual({
      usagePct: 74,
      name: 'Apple M2 Pro',
      memoryUsedBytes: 853360640,
      source: 'ioreg',
    });
  });

  it('omits the memory total on unified memory rather than inventing one', () => {
    // `Alloc system memory` is a driver reservation, not a device capacity, so
    // it must not become the denominator of a fabricated "GPU memory %".
    const sample = parseIoregAccelerator(IOREG_DARWIN);
    expect(sample?.memoryTotalBytes).toBeUndefined();
  });

  it('reads a genuine zero as zero', () => {
    const idle = IOREG_DARWIN.replace('"Device Utilization %"=74', '"Device Utilization %"=0');
    expect(parseIoregAccelerator(idle)?.usagePct).toBe(0);
  });

  it('returns null when the utilization counter is absent', () => {
    // An unrecognised dump must read as "unavailable", never as 0%.
    expect(parseIoregAccelerator('+-o SomeOtherDevice\n{ "model" = "x" }')).toBeNull();
  });

  it('survives a node with no model property', () => {
    const unnamed = IOREG_DARWIN.replace('"model" = "Apple M2 Pro"', '');
    const sample = parseIoregAccelerator(unnamed);
    expect(sample?.usagePct).toBe(74);
    expect(sample?.name).toBeUndefined();
  });
});

describe('parseNvidiaSmi', () => {
  it('parses a CSV row, converting MiB columns to bytes', () => {
    expect(parseNvidiaSmi('NVIDIA GeForce RTX 4090, 37, 2048, 24564\n')).toEqual({
      usagePct: 37,
      name: 'NVIDIA GeForce RTX 4090',
      memoryUsedBytes: 2048 * 1024 * 1024,
      memoryTotalBytes: 24564 * 1024 * 1024,
      source: 'nvidia-smi',
    });
  });

  it('takes the first device on a multi-GPU host rather than averaging', () => {
    // An average across a busy render GPU and an idle compute one describes
    // neither, and the widget renders a single figure.
    const sample = parseNvidiaSmi('GPU-0, 90, 1024, 8192\nGPU-1, 0, 0, 8192\n');
    expect(sample?.usagePct).toBe(90);
    expect(sample?.name).toBe('GPU-0');
  });

  it('keeps the utilization when memory columns are unsupported', () => {
    const sample = parseNvidiaSmi('Quadro, 12, [N/A], [N/A]\n');
    expect(sample?.usagePct).toBe(12);
    expect(sample?.memoryUsedBytes).toBeUndefined();
    expect(sample?.memoryTotalBytes).toBeUndefined();
  });

  it('returns null for empty or non-numeric output', () => {
    expect(parseNvidiaSmi('')).toBeNull();
    expect(parseNvidiaSmi('\n  \n')).toBeNull();
    expect(parseNvidiaSmi('No devices were found\n')).toBeNull();
  });
});

describe('parseSysfsBusyPercent', () => {
  it('parses the bare integer amdgpu exposes', () => {
    expect(parseSysfsBusyPercent('42\n')).toEqual({ usagePct: 42, source: 'sysfs' });
  });

  it('clamps an out-of-range reading into the contract', () => {
    // The zod schema caps usagePct at 0–100; a driver overshoot must not fail
    // validation for the whole stats response.
    expect(parseSysfsBusyPercent('137')?.usagePct).toBe(100);
    expect(parseSysfsBusyPercent('-4')?.usagePct).toBe(0);
  });

  it('returns null for unparseable contents', () => {
    expect(parseSysfsBusyPercent('unknown')).toBeNull();
  });
});

describe('createGpuProbe', () => {
  // The probe's own platform dispatch needs a host to sample, so these cover the
  // part that is testable anywhere: the latch-off policy.
  it('starts out supported', () => {
    expect(createGpuProbe().supported).toBe(true);
  });

  it('reports the current host without throwing', async () => {
    // Whatever this machine is, a probe must resolve to a sample or to null —
    // never reject, or one unreadable GPU takes down GET /system/stats.
    const probe = createGpuProbe();
    const sample = await probe.read();
    if (sample !== null) {
      expect(sample.usagePct).toBeGreaterThanOrEqual(0);
      expect(sample.usagePct).toBeLessThanOrEqual(100);
    }
  });

  it('calls onUnavailable at most once, then stops probing', async () => {
    const onUnavailable = vi.fn();
    const probe = createGpuProbe(onUnavailable);

    // Drive it well past the failure threshold. On a host that *can* read a GPU
    // this simply never latches, which is equally correct — so assert the
    // invariant that holds either way: the callback never fires twice, and a
    // latched probe returns null without further work.
    for (let i = 0; i < 10; i += 1) await probe.read();

    expect(onUnavailable.mock.calls.length).toBeLessThanOrEqual(1);
    if (!probe.supported) {
      expect(onUnavailable).toHaveBeenCalledTimes(1);
      expect(await probe.read()).toBeNull();
    }
  });
});
