import {
  Clock,
  Globe,
  GitBranch,
  MousePointerClick,
  Play,
  Sparkles,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import type { NodeCategory } from '@midnite/shared';

// dataTransfer MIME used when dragging a node type from the palette onto the canvas.
export const NODE_DRAG_MIME = 'application/midnite-node';

// Maps a NodeTypeDefinition.icon string (declared in shared) to a lucide component.
// Keeps the shared registry free of any React/lucide dependency.
const ICONS: Record<string, LucideIcon> = {
  play: Play,
  clock: Clock,
  webhook: Webhook,
  globe: Globe,
  sparkles: Sparkles,
  'git-branch': GitBranch,
  cursor: MousePointerClick,
};

export function iconFor(name: string | undefined): LucideIcon {
  return (name && ICONS[name]) || Globe;
}

// CSS custom property (defined in globals.css) for each node category's accent hue.
export function hueVarForCategory(category: NodeCategory | string): string {
  if (category === 'trigger') return '--node-trigger';
  if (category === 'logic') return '--node-logic';
  return '--node-action';
}
