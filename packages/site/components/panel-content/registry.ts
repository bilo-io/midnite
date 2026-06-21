import type { ComponentType } from 'react';

import { KanbanModule } from './kanban-module';
import { SessionModule } from './session-module';
import { TerminalModule } from './terminal-module';

export type PanelContentKey = 'terminal' | 'kanban' | 'session';

// Maps a content key to its module + the title shown in the panel chrome. Both the
// persistent panel (Theme C) and the inline mobile panel render from this.
export const PANEL_CONTENT: Record<PanelContentKey, { title: string; Component: ComponentType }> = {
  terminal: { title: 'midnite — zsh', Component: TerminalModule },
  kanban: { title: 'midnite — board', Component: KanbanModule },
  session: { title: 'midnite — session', Component: SessionModule },
};
