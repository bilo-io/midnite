'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * Tracks a set of selected item ids for bulk actions across any collection view.
 *
 * `toggle(id, shiftKey, orderedIds)` — when shiftKey is true AND orderedIds are
 * provided, selects every item between the previous anchor and the target (inclusive),
 * matching the standard shift+click range-select UX. The anchor is updated on every
 * plain (non-shift) toggle so ranges always extend from the most recent single click.
 */
export function useBulkSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const toggle = useCallback(
    (id: string, shiftKey = false, orderedIds?: readonly string[]) => {
      if (shiftKey && anchor !== null && orderedIds && orderedIds.length > 0) {
        const anchorIdx = orderedIds.indexOf(anchor);
        const targetIdx = orderedIds.indexOf(id);
        if (anchorIdx >= 0 && targetIdx >= 0) {
          const [from, to] =
            anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
          setSelected((prev) => {
            const next = new Set(prev);
            for (let i = from; i <= to; i++) next.add(orderedIds[i]!);
            return next;
          });
          // Anchor stays at the original click point — further shifts extend from there.
          return;
        }
      }
      // Plain toggle — also moves the anchor to this item.
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchor(id);
    },
    [anchor],
  );

  const clear = useCallback(() => {
    setSelected((prev) => (prev.size ? new Set() : prev));
    setAnchor(null);
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const selectedIds = useMemo(() => [...selected], [selected]);

  return { selected, selectedIds, count: selected.size, toggle, clear, isSelected };
}
