import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PwaInstall } from './pwa-install';

/** Build a `beforeinstallprompt`-shaped event with a controllable prompt. */
function installEvent() {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  const prompt = vi.fn().mockResolvedValue(undefined);
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome: 'accepted' as const });
  return { event, prompt };
}

describe('PwaInstall', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a passive hint until the browser signals installability', () => {
    render(<PwaInstall />);
    expect(screen.getByText(/will offer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
  });

  it('offers an Install button on beforeinstallprompt and triggers the prompt', async () => {
    render(<PwaInstall />);
    const { event, prompt } = installEvent();
    fireEvent(window, event);

    const button = await screen.findByRole('button', { name: /install app/i });
    fireEvent.click(button);

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    // The prompt is single-use: the button goes away after it resolves.
    await waitFor(() => expect(screen.queryByRole('button', { name: /install app/i })).toBeNull());
  });

  it('confirms once the app is installed', async () => {
    render(<PwaInstall />);
    fireEvent(window, installEvent().event);
    await screen.findByRole('button', { name: /install app/i });

    fireEvent(window, new Event('appinstalled'));
    expect(await screen.findByText(/running midnite as an app/i)).toBeInTheDocument();
  });

  it('reports already-installed when launched standalone', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    render(<PwaInstall />);
    expect(screen.getByText(/running midnite as an app/i)).toBeInTheDocument();
  });
});
