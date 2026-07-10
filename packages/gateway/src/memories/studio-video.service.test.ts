import { describe, expect, it } from 'vitest';
import type { MidniteConfig, VideoDeck } from '@midnite/shared';
import { StudioVideoService, wrapText } from './studio-video.service';

function config(mode: 'auto' | 'off', ffmpegPath?: string): MidniteConfig {
  return {
    memory: { studio: { tts: { provider: 'auto', model: 'm', voiceA: 'a', voiceB: 'b' }, video: { mode, ffmpegPath } } },
  } as unknown as MidniteConfig;
}

const DECK: VideoDeck = {
  title: 'T',
  slides: [{ heading: 'H', bullets: ['b'], narration: 'n' }],
};

describe('StudioVideoService', () => {
  it('is disabled when video mode is off', () => {
    expect(new StudioVideoService(config('off')).isEnabled()).toBe(false);
  });

  it('is disabled when a configured ffmpeg path does not exist', () => {
    const svc = new StudioVideoService(config('auto', '/no/such/ffmpeg'));
    expect(svc.isEnabled()).toBe(false);
  });

  it('compose returns null (degrade) when mode is off', async () => {
    const svc = new StudioVideoService(config('off'));
    const res = await svc.compose(DECK, { audio: Buffer.from('a'), mimeType: 'audio/mpeg', ext: 'mp3' });
    expect(res).toBeNull();
  });

  it('compose returns null (degrade) when there is no narration', async () => {
    const svc = new StudioVideoService(config('auto'));
    expect(await svc.compose(DECK, null)).toBeNull();
  });
});

describe('wrapText', () => {
  it('hard-wraps long lines to the column width', () => {
    const wrapped = wrapText('one two three four five', 8);
    for (const line of wrapped.split('\n')) expect(line.length).toBeLessThanOrEqual(10);
    expect(wrapped.split('\n').length).toBeGreaterThan(1);
  });

  it('preserves existing newlines', () => {
    expect(wrapText('a\nb', 40)).toBe('a\nb');
  });
});
