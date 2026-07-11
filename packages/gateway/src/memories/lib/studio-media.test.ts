import { describe, expect, it } from 'vitest';
import type { AudioScript, VideoDeck } from '@midnite/shared';
import {
  audioScriptUserText,
  deckNarration,
  renderAudioTranscript,
  renderVideoOutline,
  videoDeckUserText,
} from './studio-media';

const SCRIPT: AudioScript = {
  title: 'Rockets, explained',
  segments: [
    { speaker: 'A', text: 'Why do rockets go up?' },
    { speaker: 'B', text: 'Newton’s third law.' },
  ],
};

const DECK: VideoDeck = {
  title: 'Rockets',
  slides: [
    { heading: 'Thrust', bullets: ['Action', 'Reaction'], narration: 'Mass down, ship up.' },
    { heading: 'Stages', bullets: [], narration: 'Drop dead weight.' },
  ],
};

describe('studio-media prompts', () => {
  it('embeds the corpus in both user prompts', () => {
    expect(audioScriptUserText('CORPUS_X')).toContain('CORPUS_X');
    expect(videoDeckUserText('CORPUS_Y')).toContain('CORPUS_Y');
  });
});

describe('renderAudioTranscript', () => {
  it('renders a titled two-host transcript', () => {
    const md = renderAudioTranscript(SCRIPT);
    expect(md).toContain('# Rockets, explained');
    expect(md).toContain('**Host A:** Why do rockets go up?');
    expect(md).toContain('**Host B:** Newton’s third law.');
  });
});

describe('deckNarration', () => {
  it('joins every slide narration in order', () => {
    expect(deckNarration(DECK)).toBe('Mass down, ship up.\n\nDrop dead weight.');
  });
});

describe('renderVideoOutline', () => {
  it('renders numbered slides with bullets and narration', () => {
    const md = renderVideoOutline(DECK);
    expect(md).toContain('# Rockets');
    expect(md).toContain('## 1. Thrust');
    expect(md).toContain('- Action');
    expect(md).toContain('> Mass down, ship up.');
    expect(md).toContain('## 2. Stages');
  });
});
