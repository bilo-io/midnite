'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GuardrailSettings } from '@midnite/shared';
import { getGuardrails } from '@/lib/api';
import { useGuardrailsListener } from '@/lib/task-events';

const EMPTY: GuardrailSettings = {
  pausedGlobal: false,
  pausedRepos: [],
  pausedTeams: [],
  pausedBy: null,
  pausedAt: null,
};

/**
 * Live guardrail (pause/kill) state: seeds from the gateway on mount, then tracks
 * `guardrails.updated` WS events so the paused banner appears/clears without a poll.
 * `setLocal` lets a mutation apply its own response optimistically.
 */
export function useGuardrails(): {
  guardrails: GuardrailSettings;
  setLocal: (next: GuardrailSettings) => void;
} {
  const [guardrails, setGuardrails] = useState<GuardrailSettings>(EMPTY);

  useEffect(() => {
    let alive = true;
    getGuardrails()
      .then((g) => alive && setGuardrails(g))
      .catch(() => undefined); // fail-open: no banner if we can't read state
    return () => {
      alive = false;
    };
  }, []);

  const onEvent = useCallback(
    (event: { guardrails: GuardrailSettings }) => setGuardrails(event.guardrails),
    [],
  );
  useGuardrailsListener(onEvent);

  return { guardrails, setLocal: setGuardrails };
}
