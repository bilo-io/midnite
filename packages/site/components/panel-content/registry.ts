import type { ComponentType } from 'react';

import { KanbanModule } from './kanban-module';
import { SessionModule } from './session-module';
import { TerminalModule } from './terminal-module';
import { TranscriptModule } from './transcript-module';

export type PanelContentKey = 'terminal' | 'transcript' | 'kanban' | 'session';

// Maps a content key to its module + the title shown in the panel chrome. Both the
// persistent panel (Theme C) and the inline mobile panel render from this.
export const PANEL_CONTENT: Record<PanelContentKey, { title: string; Component: ComponentType }> = {
  terminal: { title: 'midnite — zsh', Component: TerminalModule },
  transcript: { title: 'midnite — zsh', Component: TranscriptModule },
  kanban: { title: 'midnite — board', Component: KanbanModule },
  session: { title: 'midnite — session', Component: SessionModule },
};
