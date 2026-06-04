import { readableTextColor } from '@midnite/shared';
import { cn } from '@/lib/utils';

/**
 * The project tag chip. Rendered with a solid fill (more opaque than the
 * translucent task "kind" badges) and an auto light/dark text color chosen from
 * the tag color's contrast.
 */
export function ProjectTag({
  tag,
  color,
  className,
}: {
  tag: string;
  color: string;
  className?: string;
}) {
  let fg = '#ffffff';
  try {
    fg = readableTextColor(color);
  } catch {
    // Invalid color (shouldn't happen — validated on save); keep white text.
  }
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        className,
      )}
      style={{ backgroundColor: color, color: fg }}
      title={tag}
    >
      {tag}
    </span>
  );
}
