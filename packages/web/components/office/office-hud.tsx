'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import type { SessionSummary } from '@midnite/shared';
import { WorkItemModal } from '@/components/work-item-modal';
import { useConfirm } from '@/components/confirm-dialog';
import { type OfficeAgent } from '@/lib/office/agents';
import { archiveSession, deleteSession, unarchiveSession } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useOfficeStore } from '@/lib/office-store';
import { BoardroomPanel } from './boardroom-panel';
import { CharacterPicker } from './CharacterPicker';
import { DeskItemPicker } from './desk-item-picker';
import { LibraryModal } from './library-modal';
import { RetroGamesMenu } from './retro-games-menu';

/**
 * React overlay for the office: a controls hint, an online count, proximity
 * prompts, and the call/message interaction panel. All state comes from the
 * office store, which the live-data hook and the Phaser scene drive.
 */
export function OfficeHud() {
  const t = useTranslations('office');
  const agents = useOfficeStore((s) => s.agents);
  const nearbyId = useOfficeStore((s) => s.nearbyId);
  const nearBoard = useOfficeStore((s) => s.nearBoard);
  const nearKitchen = useOfficeStore((s) => s.nearKitchen);
  const nearLibrary = useOfficeStore((s) => s.nearLibrary);
  const nearPlaystation = useOfficeStore((s) => s.nearPlaystation);
  const nearDoor = useOfficeStore((s) => s.nearDoor);
  const onBreak = useOfficeStore((s) => s.onBreak);
  const active = useOfficeStore((s) => s.active);
  const boardOpen = useOfficeStore((s) => s.boardOpen);
  const libraryOpen = useOfficeStore((s) => s.libraryOpen);
  const playstationOpen = useOfficeStore((s) => s.playstationOpen);
  const deskPickerOpen = useOfficeStore((s) => s.deskPickerOpen);
  const characterPickerOpen = useOfficeStore((s) => s.characterPickerOpen);
  const currentScene = useOfficeStore((s) => s.currentScene);
  const close = useOfficeStore((s) => s.close);
  const closeBoard = useOfficeStore((s) => s.closeBoard);
  const closeLibrary = useOfficeStore((s) => s.closeLibrary);
  const closePlaystation = useOfficeStore((s) => s.closePlaystation);
  const closeDeskPicker = useOfficeStore((s) => s.closeDeskPicker);
  const openCharacterPicker = useOfficeStore((s) => s.openCharacterPicker);
  const closeCharacterPicker = useOfficeStore((s) => s.closeCharacterPicker);

  const setNearby = useOfficeStore((s) => s.setNearby);
  const openDesk = useOfficeStore((s) => s.open);

  const nearby = nearbyId ? agents.find((a) => a.id === nearbyId) : undefined;
  const activeAgent = active ? agents.find((a) => a.id === active.id) : undefined;
  // D2: inline count + first-attention agent for the clickable badge.
  const attentionAgents = agents.filter((a) => a.attention);
  const attentionCount = attentionAgents.length;
  const firstAttention = attentionAgents[0];
  const panelOpen = active !== null || boardOpen || libraryOpen || playstationOpen || deskPickerOpen;
  const inCorner = currentScene === 'corner';

  // Rich-text renderers shared by the HUD copy: <k>…</k> → keycap, <b>…</b> → bold.
  const k = (chunks: React.ReactNode) => <Key>{chunks}</Key>;
  const b = (chunks: React.ReactNode) => <span className="font-semibold">{chunks}</span>;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-3 top-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        {t.rich('hud.controls', { k })}
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-2">
        {inCorner ? (
          <>
            <button
              type="button"
              onClick={openCharacterPicker}
              className="pointer-events-auto rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {t('hud.avatar')}
            </button>
            <button
              type="button"
              onClick={() => {
                // The corner office scene will pick up currentScene='office' via its store sub.
                useOfficeStore.getState().setCurrentScene('office');
              }}
              className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              {t('hud.backToOffice')}
            </button>
          </>
        ) : (
          <>
            {attentionCount > 0 && firstAttention ? (
              <button
                type="button"
                onClick={() => {
                  setNearby(firstAttention.id);
                  openDesk(firstAttention.id);
                }}
                className="pointer-events-auto animate-pulse rounded-md border border-orange-500/60 bg-orange-500/20 px-2.5 py-1.5 text-[11px] font-medium text-orange-600 backdrop-blur transition-colors hover:bg-orange-500/30 dark:text-orange-400"
                aria-label={t('hud.attentionAria', { count: attentionCount })}
              >
                {t('hud.attention', { count: attentionCount })}
              </button>
            ) : null}
            {onBreak ? (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 backdrop-blur dark:text-amber-400">
                {t('hud.onBreak')}
              </span>
            ) : null}
            <span className="rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
              {t('hud.online', { count: agents.length })}
            </span>
          </>
        )}
      </div>

      {panelOpen ? null : inCorner ? (
        nearDoor ? (
          <Prompt>{t.rich('hud.prompts.mainOffice', { k, b })}</Prompt>
        ) : (
          <Prompt>{t.rich('hud.prompts.customiseDesk', { k, b })}</Prompt>
        )
      ) : nearBoard ? (
        <Prompt>{t.rich('hud.prompts.board', { k, b })}</Prompt>
      ) : nearKitchen ? (
        <Prompt>{t.rich(onBreak ? 'hud.prompts.kitchenBack' : 'hud.prompts.kitchenBreak', { k, b })}</Prompt>
      ) : nearLibrary ? (
        <Prompt>{t.rich('hud.prompts.library', { k, b })}</Prompt>
      ) : nearPlaystation ? (
        <Prompt>{t.rich('hud.prompts.games', { k, b })}</Prompt>
      ) : nearDoor ? (
        <Prompt>{t.rich('hud.prompts.corner', { k, b })}</Prompt>
      ) : nearby ? (
        <Prompt>{t.rich('hud.prompts.agent', { k, b, name: nearby.name })}</Prompt>
      ) : agents.length === 0 && !inCorner ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          {t('hud.empty')}
        </div>
      ) : null}

      {active && activeAgent ? <InteractionPanel agent={activeAgent} onClose={close} /> : null}

      {boardOpen ? <BoardroomPanel onClose={closeBoard} /> : null}

      {libraryOpen ? <LibraryModal onClose={closeLibrary} /> : null}

      {playstationOpen ? <RetroGamesMenu onClose={closePlaystation} /> : null}

      {deskPickerOpen ? <DeskItemPicker onClose={closeDeskPicker} /> : null}

      {characterPickerOpen ? <CharacterPicker onClose={closeCharacterPicker} /> : null}
    </div>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
      {children}
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

/**
 * Approaching an agent opens its session directly — no call/message menu, since
 * an office occupant *is* an agent running a known task. It opens the unified
 * work-item modal (Phase 70) on its Session tab — a live terminal for a running
 * agent, a transcript otherwise — with the task's Details tab a click away. It
 * carries the full control row the board modal has (archive / delete / export /
 * lifecycle + "Open page", which expands into the session cockpit). The modal
 * portals to <body> itself, so a persisted page-reveal transform / the stage's
 * `overflow-hidden` can't clip it.
 */
function InteractionPanel({ agent, onClose }: { agent: OfficeAgent; onClose: () => void }) {
  const t = useTranslations('office');
  const confirm = useConfirm();

  const onArchiveToggle = async (session: SessionSummary) => {
    if (!session.archivedAt) {
      const ok = await confirm({
        title: t('hud.archiveConfirm.title'),
        description: t('hud.archiveConfirm.description'),
        confirmLabel: t('hud.archiveConfirm.confirm'),
        tone: 'neutral',
      });
      if (!ok) return;
    }
    try {
      if (session.archivedAt) await unarchiveSession(session.id);
      else await archiveSession(session.id);
    } finally {
      onClose();
      invalidateData();
    }
  };

  const onDelete = async (session: SessionSummary) => {
    try {
      await deleteSession(session.id);
    } finally {
      onClose();
      invalidateData();
    }
  };

  return (
    <WorkItemModal
      origin={{ kind: 'session', session: agent.session }}
      projects={[]}
      onClose={onClose}
      onArchiveToggle={(s) => void onArchiveToggle(s)}
      onDelete={(s) => void onDelete(s)}
    />
  );
}
