'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IdeaMessage } from '@midnite/shared';
import { listIdeaMessages, sendIdeaMessage } from '@/lib/api';

const ideaMessagesKey = (ideaId: string) => ['idea-messages', ideaId] as const;

/**
 * Chat thread for a single idea (Phase 42 Theme A). Loads history via
 * `GET /ideas/:id/messages` and exposes a `send` mutation that posts the user's
 * message and the assistant reply in one round-trip (`POST /ideas/:id/messages`),
 * appending both to the cached thread when it resolves.
 */
export function useIdeaMessages(ideaId: string) {
  const qc = useQueryClient();

  const query = useQuery<IdeaMessage[]>({
    queryKey: ideaMessagesKey(ideaId),
    queryFn: async () => (await listIdeaMessages(ideaId)).messages,
    enabled: ideaId.length > 0,
  });

  const mutation = useMutation({
    mutationFn: (content: string) => sendIdeaMessage(ideaId, { content }),
    onSuccess: ({ userMessage, assistantMessage }) => {
      qc.setQueryData<IdeaMessage[]>(ideaMessagesKey(ideaId), (prev) => [
        ...(prev ?? []),
        userMessage,
        assistantMessage,
      ]);
    },
  });

  const send = useCallback(
    (content: string) => mutation.mutateAsync(content),
    [mutation],
  );

  return {
    messages: query.data ?? [],
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    send,
    sending: mutation.isPending,
  };
}
