import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { LockScreen } from '@midnite/shell';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 E — the shell `<LockScreen>` stays catalog-free; web injects its copy
 * via the `labels` prop from the `nav.lockScreen.*` catalog keys (the same wiring
 * `Screensaver` uses). This pins that seam end-to-end: rendered under fr-FR, the
 * web-passed t() labels surface as the dialog name + wake/unlock hints.
 */
function LockHost({ requireCode }: { requireCode: boolean }) {
  const tNav = useTranslations('nav');
  return (
    <LockScreen
      requireCode={requireCode}
      passcode="1234"
      animateBackground={false}
      labels={{
        locked: tNav('lockScreen.locked'),
        screensaver: tNav('lockScreen.screensaver'),
        unlockHint: tNav('lockScreen.unlockHint'),
        wakeHint: tNav('lockScreen.wakeHint'),
      }}
    />
  );
}

describe('LockScreen — web-injected labels (fr-FR)', () => {
  it('shows the French dialog label and unlock hint when a passcode is required', () => {
    renderWithIntl(<LockHost requireCode />, { locale: 'fr-FR' });
    expect(
      screen.getByRole('dialog', { name: 'Écran de veille verrouillé' }),
    ).toBeInTheDocument();
    expect(screen.getByText('appuyez sur une touche pour déverrouiller')).toBeInTheDocument();
  });

  it('shows the French screensaver label and wake hint when dismissible', () => {
    renderWithIntl(<LockHost requireCode={false} />, { locale: 'fr-FR' });
    expect(screen.getByRole('dialog', { name: 'Écran de veille' })).toBeInTheDocument();
    expect(screen.getByText('appuyez sur une touche pour réveiller')).toBeInTheDocument();
  });

  it('keeps the shell English defaults when no labels are injected', () => {
    renderWithIntl(<LockScreen requireCode={false} animateBackground={false} />);
    expect(screen.getByRole('dialog', { name: 'Screensaver' })).toBeInTheDocument();
    expect(screen.getByText('press any key to wake')).toBeInTheDocument();
  });
});
