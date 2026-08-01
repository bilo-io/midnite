import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import { renderWithIntl as render } from '@/vitest.render-intl';
import { UpdateBannerView } from './update-banner-view';

afterEach(cleanup);

const base = {
  visible: true,
  belowFloor: false,
  latest: '0.2.0',
  onUpdate: vi.fn(),
  onDismiss: vi.fn(),
};

describe('UpdateBannerView', () => {
  it('shows the version and an Update action when visible', () => {
    render(<UpdateBannerView {...base} />);
    expect(screen.getByText(/new version is available/i)).toBeInTheDocument();
    expect(screen.getByText('v0.2.0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('is aria-hidden when not visible (animated out)', () => {
    const { container } = render(<UpdateBannerView {...base} visible={false} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes the version as a release-notes popover trigger', () => {
    render(<UpdateBannerView {...base} notesUrl="https://example.com/notes" />);
    // The version is a button that opens the release-notes popover (not a bare link).
    const trigger = screen.getByRole('button', { name: 'v0.2.0' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('calls onUpdate when Update is clicked', () => {
    const onUpdate = vi.fn();
    render(<UpdateBannerView {...base} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when the × is clicked', () => {
    const onDismiss = vi.fn();
    render(<UpdateBannerView {...base} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss update notice/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('removes the dismiss button below the force-update floor', () => {
    render(<UpdateBannerView {...base} belowFloor />);
    expect(screen.queryByRole('button', { name: /dismiss update notice/i })).toBeNull();
    expect(screen.getByText(/update required to keep using midnite/i)).toBeInTheDocument();
  });

  it('shows emphatic "no longer supported" copy below the floor (Phase 71 H)', () => {
    render(<UpdateBannerView {...base} belowFloor />);
    expect(screen.getByText(/no longer supported, please update to continue/i)).toBeInTheDocument();
  });

  // Desktop (electron-updater) states — the container feeds these props per phase.
  it('renders a custom headline + action label (e.g. desktop "Restart to install")', () => {
    render(
      <UpdateBannerView
        {...base}
        headline="An update is ready to install"
        actionLabel="Restart to install"
      />,
    );
    expect(screen.getByText('An update is ready to install')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart to install' })).toBeInTheDocument();
  });

  it('shows a download progress bar and disables the action while downloading', () => {
    render(
      <UpdateBannerView
        {...base}
        headline="Downloading update…"
        actionLabel="Downloading 42%"
        actionDisabled
        downloadPercent={42}
      />,
    );
    const bar = screen.getByRole('progressbar', { name: /downloading update/i });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByRole('button', { name: 'Downloading 42%' })).toBeDisabled();
  });

  it('offers Retry when the desktop update failed', () => {
    render(<UpdateBannerView {...base} headline="Update failed" actionLabel="Retry" />);
    expect(screen.getByText('Update failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('has no progress bar when downloadPercent is null', () => {
    render(<UpdateBannerView {...base} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('renders French copy under fr-FR (Phase 82 E)', () => {
    render(<UpdateBannerView {...base} />, { locale: 'fr-FR' });
    expect(screen.getByText('Une nouvelle version est disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mettre à jour' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ignorer l’avis de mise à jour' }),
    ).toBeInTheDocument();
  });

  // Manual-install mode (unsigned macOS desktop build): the update can't install
  // in place, so the action becomes "copy the curl installer command".
  describe('manual-install mode (copyCommand)', () => {
    const command = 'curl -fsSL https://example.com/install.sh | sh';

    it('replaces the Update action with a copy button and shows the command', () => {
      render(<UpdateBannerView {...base} copyCommand={command} />);
      expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
      expect(screen.getByRole('button', { name: /copy install command/i })).toBeInTheDocument();
      expect(screen.getByText(command)).toBeInTheDocument();
    });

    it('copies the command to the clipboard and confirms', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
      try {
        render(<UpdateBannerView {...base} copyCommand={command} />);
        fireEvent.click(screen.getByRole('button', { name: /copy install command/i }));
        expect(writeText).toHaveBeenCalledWith(command);
        expect(await screen.findByRole('button', { name: /copied!/i })).toBeInTheDocument();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('still allows dismissing the banner', () => {
      const onDismiss = vi.fn();
      render(<UpdateBannerView {...base} copyCommand={command} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole('button', { name: /dismiss update notice/i }));
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });
});
