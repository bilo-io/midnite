import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@midnite/shared';
import { outputLanguageInstruction, withOutputLanguage } from './output-language';

describe('outputLanguageInstruction', () => {
  it('is empty for no locale (nothing to say)', () => {
    expect(outputLanguageInstruction()).toBe('');
    expect(outputLanguageInstruction(undefined)).toBe('');
    expect(outputLanguageInstruction(null)).toBe('');
  });

  it('is empty for en-GB — the models default to English, so no wasted tokens', () => {
    expect(outputLanguageInstruction('en-GB')).toBe('');
  });

  it('names the language (English + native) for each non-default locale', () => {
    expect(outputLanguageInstruction('fr-FR')).toContain('French (Français)');
    expect(outputLanguageInstruction('de-DE')).toContain('German (Deutsch)');
    expect(outputLanguageInstruction('es-ES')).toContain('Spanish (Español)');
  });

  it('honours locales whose UI catalog is only a stub (no clamping to en-GB/fr-FR)', () => {
    for (const info of SUPPORTED_LOCALES) {
      const instruction = outputLanguageInstruction(info.code);
      if (info.code === 'en-GB') {
        expect(instruction).toBe('');
      } else {
        expect(instruction).toContain(info.label);
        expect(instruction).toContain(info.nativeLabel);
      }
    }
  });

  it('tells the model to leave ids, code and URLs alone', () => {
    const instruction = outputLanguageInstruction('de-DE');
    expect(instruction).toContain('source ids');
    expect(instruction).toContain('code identifiers');
    expect(instruction).toContain('URLs');
    expect(instruction).toContain('unchanged');
  });
});

describe('withOutputLanguage', () => {
  it('returns the prompt untouched for en-GB / no locale', () => {
    expect(withOutputLanguage('BASE')).toBe('BASE');
    expect(withOutputLanguage('BASE', 'en-GB')).toBe('BASE');
  });

  it('appends the instruction after the original prompt', () => {
    const composed = withOutputLanguage('BASE', 'fr-FR');
    expect(composed.startsWith('BASE ')).toBe(true);
    expect(composed).toContain('French (Français)');
  });
});
