import { render, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { LocaleProvider, type LocaleMessages } from './locale-provider';

// A minimal three-locale catalog set: en-GB canonical, fr-FR fully translated,
// de-DE intentionally empty here (must fall back to en-GB). The empty entry is a
// *fixture* for the fallback mechanism, not a claim about the app's real catalogs —
// all four of `web`'s locales are authored to full parity, so no shipping locale is a
// stub. The mechanism still matters for whatever locale is declared next, which is
// exactly why it is tested from a fixture rather than from whatever happens to ship.
const CATALOGS: Record<string, LocaleMessages> = {
  'en-GB': { common: { save: 'Save', cancel: 'Cancel' } },
  'fr-FR': { common: { save: 'Enregistrer', cancel: 'Annuler' } },
  'de-DE': {},
};

function Probe() {
  const t = useTranslations('common');
  return (
    <>
      <span data-testid="save">{t('save')}</span>
      <span data-testid="cancel">{t('cancel')}</span>
    </>
  );
}

describe('LocaleProvider', () => {
  it('renders the source (en-GB) strings by default', () => {
    render(
      <LocaleProvider catalogs={CATALOGS} initialLocale="en-GB">
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('save').textContent).toBe('Save');
  });

  it('renders the active locale strings (fr-FR)', () => {
    render(
      <LocaleProvider catalogs={CATALOGS} initialLocale="fr-FR">
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('save').textContent).toBe('Enregistrer');
    expect(screen.getByTestId('cancel').textContent).toBe('Annuler');
  });

  it('falls back to en-GB for a locale with an empty/partial catalog (de-DE)', () => {
    render(
      <LocaleProvider catalogs={CATALOGS} initialLocale="de-DE">
        <Probe />
      </LocaleProvider>,
    );
    // de-DE has no keys yet → merged over en-GB → English source strings, not raw keys.
    expect(screen.getByTestId('save').textContent).toBe('Save');
    expect(screen.getByTestId('cancel').textContent).toBe('Cancel');
  });
});
