import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';
import { useTranslations } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB.json';
import frFR from '@/messages/fr-FR.json';
import { CATALOGS } from '@/i18n/messages';

/** Recursively collect the dotted key paths of a catalog for parity comparison. */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? keyPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

/** Exercises one key per translated namespace (Phase 79 D). */
function Probe() {
  const nav = useTranslations('nav');
  const auth = useTranslations('auth');
  const board = useTranslations('board');
  const settings = useTranslations('settings');
  const common = useTranslations('common');
  return (
    <ul>
      <li data-testid="nav">{nav('features.tasks')}</li>
      <li data-testid="auth">{auth('signIn')}</li>
      <li data-testid="board">{board('columns.wip')}</li>
      <li data-testid="settings">{settings('groups.general')}</li>
      <li data-testid="common">{common('cancel')}</li>
      <li data-testid="interp">{auth('continueWith', { provider: 'GitHub' })}</li>
    </ul>
  );
}

function renderAt(locale: Locale) {
  return render(
    <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
      <Probe />
    </LocaleProvider>,
  );
}

describe('Phase 79 D — surface translation', () => {
  it('renders the fr-FR strings across every converted namespace', () => {
    renderAt('fr-FR');
    expect(screen.getByTestId('nav').textContent).toBe('Tâches');
    expect(screen.getByTestId('auth').textContent).toBe('Se connecter');
    expect(screen.getByTestId('board').textContent).toBe('En cours');
    expect(screen.getByTestId('settings').textContent).toBe('Général');
    expect(screen.getByTestId('common').textContent).toBe('Annuler');
  });

  it('interpolates ICU args (provider name is not translated)', () => {
    renderAt('fr-FR');
    expect(screen.getByTestId('interp').textContent).toBe('Continuer avec GitHub');
  });

  it('falls back to en-GB for a locale with no catalog yet (de-DE, seeded in Theme E)', () => {
    renderAt('de-DE');
    expect(screen.getByTestId('board').textContent).toBe('In progress');
    expect(screen.getByTestId('nav').textContent).toBe('Tasks');
  });

  it('keeps fr-FR at full key parity with the canonical en-GB catalog', () => {
    expect(new Set(keyPaths(frFR))).toEqual(new Set(keyPaths(enGB)));
  });
});
