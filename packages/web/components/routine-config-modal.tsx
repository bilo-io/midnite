'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type { Routine } from '@midnite/shared';
import {
  addRoutineGroup,
  addRoutineItem,
  createRoutine,
  deleteRoutine,
  deleteRoutineGroup,
  deleteRoutineItem,
  updateRoutineGroup,
  updateRoutineItem,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';

interface RoutineConfigModalProps {
  routine: Routine | null;
  onClose: () => void;
  onUpdate: (routine: Routine) => void;
  onDelete?: (id: string) => void;
}

export function RoutineConfigModal({ routine, onClose, onUpdate, onDelete }: RoutineConfigModalProps) {
  const confirm = useConfirm();
  const [current, setCurrent] = useState<Routine | null>(routine);
  const [newRoutineName, setNewRoutineName] = useState('My Routine');
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingItemGroupId, setAddingItemGroupId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (addingItemGroupId) newItemInputRef.current?.focus();
  }, [addingItemGroupId]);

  // ---- Create new routine ----
  const handleCreate = async () => {
    if (!newRoutineName.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createRoutine({ name: newRoutineName.trim() });
      setCurrent(created);
    } finally {
      setCreating(false);
    }
  };

  // ---- Groups ----
  const handleAddGroup = async () => {
    if (!current || !newGroupName.trim()) return;
    const updated = await addRoutineGroup(current.id, { name: newGroupName.trim() });
    setCurrent(updated);
    setNewGroupName('');
  };

  const handleRenameGroup = async (gid: string) => {
    if (!current || !editingGroupName.trim()) { setEditingGroupId(null); return; }
    const updated = await updateRoutineGroup(current.id, gid, { name: editingGroupName.trim() });
    setCurrent(updated);
    setEditingGroupId(null);
  };

  const handleDeleteGroup = async (gid: string, name: string) => {
    if (!current) return;
    const ok = await confirm({ title: `Delete group "${name}"?`, description: 'All items in this group will be deleted.', confirmLabel: 'Delete' });
    if (!ok) return;
    const updated = await deleteRoutineGroup(current.id, gid);
    setCurrent(updated);
  };

  const moveGroup = async (gid: string, dir: -1 | 1) => {
    if (!current) return;
    const groups = [...current.groups].sort((a, b) => a.position - b.position);
    const idx = groups.findIndex((g) => g.id === gid);
    const target = groups[idx + dir];
    if (!target) return;
    const [r1, r2] = await Promise.all([
      updateRoutineGroup(current.id, gid, { position: target.position }),
      updateRoutineGroup(current.id, target.id, { position: groups[idx]!.position }),
    ]);
    // Second response has both applied
    setCurrent(r2);
  };

  // ---- Items ----
  const handleAddItem = async (gid: string) => {
    if (!current || !newItemTitle.trim()) return;
    const updated = await addRoutineItem(current.id, gid, { title: newItemTitle.trim() });
    setCurrent(updated);
    setNewItemTitle('');
    setAddingItemGroupId(null);
  };

  const handleRenameItem = async (iid: string) => {
    if (!current || !editingItemTitle.trim()) { setEditingItemId(null); return; }
    const updated = await updateRoutineItem(current.id, iid, { title: editingItemTitle.trim() });
    setCurrent(updated);
    setEditingItemId(null);
  };

  const handleDeleteItem = async (iid: string, title: string) => {
    if (!current) return;
    const ok = await confirm({ title: `Delete "${title}"?`, confirmLabel: 'Delete' });
    if (!ok) return;
    const updated = await deleteRoutineItem(current.id, iid);
    setCurrent(updated);
  };

  // ---- Delete routine ----
  const handleDeleteRoutine = async () => {
    if (!current) return;
    const ok = await confirm({
      title: `Delete routine "${current.name}"?`,
      description: 'All groups, items, and progress history will be permanently deleted.',
      confirmLabel: 'Delete routine',
    });
    if (!ok) return;
    await deleteRoutine(current.id);
    onDelete?.(current.id);
  };

  // Propagate updates to parent when closing
  const handleClose = () => {
    if (current) onUpdate(current);
    else onClose();
  };

  const sortedGroups = current ? [...current.groups].sort((a, b) => a.position - b.position) : [];

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={handleClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Configure routine"
          className="pointer-events-auto flex w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">
              {current ? `Configure: ${current.name}` : 'New routine'}
            </h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* Create new routine form */}
            {!current && (
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground">Routine name</label>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="e.g. Daily Routine"
                  />
                  <Button onClick={handleCreate} disabled={creating || !newRoutineName.trim()} size="sm">
                    Create
                  </Button>
                </div>
              </div>
            )}

            {/* Groups */}
            {current && (
              <div className="space-y-4">
                {sortedGroups.map((group, gi) => (
                  <div key={group.id} className="rounded-lg border border-border/60 bg-background/50">
                    {/* Group header */}
                    <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                      <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                      {editingGroupId === group.id ? (
                        <input
                          autoFocus
                          className="flex-1 bg-transparent text-sm font-medium outline-none"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onBlur={() => handleRenameGroup(group.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameGroup(group.id);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                        />
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          className="flex-1 cursor-text text-sm font-medium"
                          onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                          onKeyDown={(e) => e.key === 'Enter' && (setEditingGroupId(group.id), setEditingGroupName(group.name))}
                        >
                          {group.name}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveGroup(group.id, -1)}
                          disabled={gi === 0}
                          className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGroup(group.id, 1)}
                          disabled={gi === sortedGroups.length - 1}
                          className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="rounded p-0.5 text-muted-foreground/60 hover:text-destructive"
                          aria-label="Delete group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    <ul className="divide-y divide-border/30 px-3">
                      {group.items.map((item) => (
                        <li key={item.id} className="group flex items-center gap-2 py-1.5">
                          {editingItemId === item.id ? (
                            <input
                              autoFocus
                              className="flex-1 bg-transparent text-sm outline-none"
                              value={editingItemTitle}
                              onChange={(e) => setEditingItemTitle(e.target.value)}
                              onBlur={() => handleRenameItem(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameItem(item.id);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                            />
                          ) : (
                            <span
                              role="button"
                              tabIndex={0}
                              className="flex-1 cursor-text text-sm"
                              onClick={() => { setEditingItemId(item.id); setEditingItemTitle(item.title); }}
                              onKeyDown={(e) => e.key === 'Enter' && (setEditingItemId(item.id), setEditingItemTitle(item.title))}
                            >
                              {item.title}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-destructive transition-opacity"
                            aria-label="Delete item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>

                    {/* Add item */}
                    <div className="px-3 pb-2 pt-1">
                      {addingItemGroupId === group.id ? (
                        <div className="flex gap-2">
                          <input
                            ref={newItemInputRef}
                            className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            placeholder="Item title…"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddItem(group.id);
                              if (e.key === 'Escape') { setAddingItemGroupId(null); setNewItemTitle(''); }
                            }}
                          />
                          <Button size="sm" onClick={() => handleAddItem(group.id)} disabled={!newItemTitle.trim()}>
                            Add
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setAddingItemGroupId(group.id); setNewItemTitle(''); }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add item
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add group */}
                <div className="flex gap-2">
                  <input
                    className="flex h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New group name…"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                    <Plus className="h-3.5 w-3.5" /> Group
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {current && (
            <footer className="flex flex-shrink-0 items-center justify-between border-t border-border/60 px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteRoutine}
              >
                Delete routine
              </Button>
              <Button size="sm" onClick={handleClose}>Done</Button>
            </footer>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
