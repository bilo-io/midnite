import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D (composer slice) — behavioural fr-FR renders for the dashboard
 * prompt composer.
 *
 * The `jsx-text-only` lint gate structurally can't see any of the copy this file
 * asserts, so a green lint run says nothing about it. Each case is chosen for one of
 * those blind classes:
 *
 * - the textarea **`placeholder`**
 * - **aria-labels** on the icon-only controls (attach, dictation) and on the
 *   full-screen toggle that lives in `composer-fullscreen.tsx`
 * - a **`title=` tooltip** (the Ping button's "is the AI reachable" hint)
 * - an **ICU plural** + a count-interpolated button label (`2 tâches` / `Ajouter 2`)
 * - **error copy**: the status panel's translated fallback title, reached when the
 *   API error carries only a JSON body and no human-readable head
 */

const pingAgent = vi.fn();
vi.mock('@/lib/api', () => ({
  pingAgent: (...a: unknown[]) => pingAgent(...a),
  // feature-list-modal (imported by the composer) binds this at module load.
  createTask: vi.fn(),
}));

// jsdom has no SpeechRecognition, so the real hook reports `supported: false` and the
// dictation button never mounts — stub it so its aria-label is assertable.
vi.mock('@/lib/use-speech-recognition', () => ({
  useSpeechRecognition: () => ({
    supported: true,
    listening: false,
    interim: '',
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

import { PromptComposer } from './prompt-composer';

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  // The composer withholds its controls row for ~1.15s of intro animation unless the
  // user prefers reduced motion — claim that so the row renders synchronously.
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

const fr = { locale: 'fr-FR' } as const;

describe('PromptComposer — fr-FR', () => {
  it('translates the prompt placeholder and the icon-button aria-labels', () => {
    renderWithIntl(<PromptComposer />, fr);

    expect(
      screen.getByPlaceholderText('Ajoutez des tâches, une par ligne · ⌘/Ctrl + ⏎'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Joindre une image')).toBeInTheDocument();
    expect(screen.getByLabelText('Démarrer la dictée')).toBeInTheDocument();
    // Contributed by composer-fullscreen.tsx's toggle, mounted inside the card.
    expect(screen.getByLabelText('Afficher la saisie en plein écran')).toBeInTheDocument();
  });

  it('translates the Ping control, tooltip included', () => {
    renderWithIntl(<PromptComposer />, fr);

    const ping = screen.getByLabelText('Tester l’IA');
    expect(ping).toHaveAttribute('title', 'Vérifier que l’IA est joignable');
    expect(ping).toHaveTextContent('Tester');
  });

  it('pluralises the task count and the submit label in French', () => {
    renderWithIntl(<PromptComposer />, fr);

    fireEvent.change(screen.getByPlaceholderText(/Ajoutez des tâches/), {
      target: { value: 'corriger la connexion\nexpédier la facturation' },
    });

    expect(screen.getByText('2 tâches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter 2' })).toBeInTheDocument();
  });

  it('falls back to translated error copy when the failure carries only a JSON body', async () => {
    pingAgent.mockRejectedValue(new Error('{"statusCode":500}'));
    renderWithIntl(<PromptComposer />, fr);

    fireEvent.click(screen.getByLabelText('Tester l’IA'));

    await waitFor(() => expect(screen.getByText('Échec de la requête')).toBeInTheDocument());
    expect(screen.getByLabelText('Afficher les détails')).toBeInTheDocument();
    expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
  });
});
