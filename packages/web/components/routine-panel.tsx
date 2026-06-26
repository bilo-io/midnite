'use client';

import { useCallback, useState } from 'react';
import { BarChart2, Settings } from 'lucide-react';
import type { Routine, RoutineProgress, RoutineProgressSnapshot } from '@midnite/shared';
import { recordRoutineProgress } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RoutineConfigModal } from './routine-config-modal';
import { RoutineHistoryModal } from './routine-history-modal';

const SETTLE_MS = 1150;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildSnapshot(routine: Routine, itemStatus: Record<string, boolean>): RoutineProgressSnapshot {
  return {
    groups: routine.groups.map((g) => ({
      id: g.id,
      name: g.name,
      items: g.items.map((item) => ({
        id: item.id,
        title: item.title,
        done: itemStatus[item.id] ?? false,
      })),
    })),
  };
}

function statusFromProgress(routine: Routine, progress: RoutineProgress | undefined): Record<string, boolean> {
  if (!progress) return {};
  const status: Record<string, boolean> = {};
  for (const g of progress.snapshot.groups) {
    for (const item of g.items) status[item.id] = item.done;
  }
  return status;
}

export function RoutinePanel({ routines: initial, progress: initialProgress }: {
  routines: Routine[];
  progress: RoutineProgress[];
}) {
  const [routines, setRoutines] = useState<Routine[]>(initial);
  const [configRoutineId, setConfigRoutineId] = useState<string | null>(null);
  const [historyRoutineId, setHistoryRoutineId] = useState<string | null>(null);

  const [statusMap, setStatusMap] = useState<Record<string, Record<string, boolean>>>(() => {
    const m: Record<string, Record<string, boolean>> = {};
    for (const r of initial) {
      m[r.id] = statusFromProgress(r, initialProgress.find((p) => p.routineId === r.id));
    }
    return m;
  });

  const toggle = useCallback((routineId: string, itemId: string) => {
    setStatusMap((prev) => {
      const routineStatus = prev[routineId] ?? {};
      const next = { ...routineStatus, [itemId]: !routineStatus[itemId] };
      recordRoutineProgress(routineId, { date: todayDate(), itemStatus: next }).catch(() => {
        setStatusMap((m) => ({ ...m, [routineId]: routineStatus }));
      });
      return { ...prev, [routineId]: next };
    });
  }, []);

  if (routines.length === 0) {
    return (
      <section
        className="cascade-item flex h-full items-center justify-center rounded-xl border bg-card px-5 py-10 text-center shadow-sm"
        style={{ animationDelay: `${SETTLE_MS + 8 * 70}ms` }}
      >
        <p className="text-sm text-muted-foreground">No routines yet.</p>
        <button type="button" onClick={() => setConfigRoutineId('__new__')} className="mt-2 text-sm text-primary hover:underline">
          Create your first routine
        </button>
        {configRoutineId === '__new__' && (
          <RoutineConfigModal
            routine={null}
            onClose={() => setConfigRoutineId(null)}
            onUpdate={(r) => {
              setRoutines((prev) => {
                const idx = prev.findIndex((x) => x.id === r.id);
                return idx >= 0 ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r];
              });
              setStatusMap((m) => ({ ...m, [r.id]: {} }));
              setConfigRoutineId(null);
            }}
          />
        )}
      </section>
    );
  }

  return (
    <>
      <div className="cascade-item h-full space-y-3" style={{ animationDelay: `${SETTLE_MS + 8 * 70}ms` }}>
        {routines.map((routine) => {
          const itemStatus = statusMap[routine.id] ?? {};
          const snapshot = buildSnapshot(routine, itemStatus);
          const allItems = snapshot.groups.flatMap((g) => g.items);
          const totalDone = allItems.filter((i) => i.done).length;
          const totalAll = allItems.length;
          const overallPct = totalAll === 0 ? 0 : totalDone / totalAll;
          const overallComplete = totalAll > 0 && totalDone === totalAll;

          return (
            <section key={routine.id} className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="truncate text-sm font-semibold">{routine.name}</span>
                  {totalAll > 0 && (
                    <span className={cn(
                      'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-all duration-500',
                      overallComplete ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground',
                    )}>
                      {overallComplete ? '✓ All done' : `${totalDone}/${totalAll}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <button type="button" onClick={() => setHistoryRoutineId(routine.id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="View history">
                    <BarChart2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setConfigRoutineId(routine.id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="Configure routine">
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Overall progress strip */}
              {totalAll > 0 && (
                <div className="h-px w-full bg-border/40">
                  <div className="h-full transition-all duration-700 ease-out" style={{
                    width: `${overallPct * 100}%`,
                    background: overallComplete ? 'hsl(142 71% 45%)' : 'hsl(var(--primary))',
                    boxShadow: overallPct > 0
                      ? overallComplete ? '0 0 6px 1px hsl(142 71% 45% / 0.7)' : '0 0 5px 1px hsl(var(--primary) / 0.5)'
                      : undefined,
                  }} />
                </div>
              )}

              {/* Groups */}
              <div className="divide-y divide-border/20">
                {routine.groups.map((group) => {
                  const groupSnap = snapshot.groups.find((g) => g.id === group.id);
                  const groupItems = groupSnap?.items ?? [];
                  const done = groupItems.filter((i) => i.done).length;
                  const total = groupItems.length;
                  const pct = total === 0 ? 0 : done / total;
                  const complete = total > 0 && done === total;

                  return (
                    <div key={group.id} className={cn(
                      'px-3 py-3 transition-colors duration-700',
                      complete && 'bg-emerald-500/[0.03]',
                    )}>
                      {/* Group label + progress bar */}
                      <div className="mb-2 flex items-center gap-3">
                        <span className={cn(
                          'text-[10px] font-semibold uppercase tracking-widest transition-colors duration-500 flex-shrink-0',
                          complete ? 'text-emerald-500' : 'text-muted-foreground',
                        )}>
                          {group.name}
                        </span>
                        {total > 0 && (
                          <div className="relative flex-1 h-1 overflow-hidden rounded-full bg-muted/40">
                            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{
                              width: `${pct * 100}%`,
                              background: complete ? 'hsl(142 71% 45%)' : 'hsl(var(--primary))',
                              boxShadow: pct > 0
                                ? complete ? '0 0 8px 2px hsl(142 71% 45% / 0.7)' : '0 0 6px 1px hsl(var(--primary) / 0.5)'
                                : undefined,
                            }} />
                          </div>
                        )}
                        <span className="text-[10px] tabular-nums text-muted-foreground flex-shrink-0">{done}/{total}</span>
                      </div>

                      {/* Item cards grid */}
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {group.items.map((item) => {
                          const isDone = itemStatus[item.id] ?? false;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggle(routine.id, item.id)}
                              className={cn(
                                'group relative overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.97]',
                                isDone
                                  ? 'border-emerald-500/50 bg-emerald-500/[0.07] hover:bg-emerald-500/10'
                                  : 'border-border/50 bg-background/60 hover:border-border hover:bg-accent/30',
                              )}
                              style={isDone ? { boxShadow: '0 0 0 1px hsl(142 71% 45% / 0.3), 0 0 12px 0 hsl(142 71% 45% / 0.15)' } : undefined}
                              aria-pressed={isDone}
                            >
                              {/* Checkmark badge */}
                              <span className={cn(
                                'absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full transition-all duration-300',
                                isDone ? 'bg-emerald-500 opacity-100 scale-100' : 'opacity-0 scale-50',
                              )}
                                style={isDone ? { boxShadow: '0 0 6px 1px hsl(142 71% 45% / 0.6)' } : undefined}
                              >
                                <svg viewBox="0 0 8 7" fill="none" className="h-2 w-2 text-white">
                                  <path d="M1 3.5l2 2L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>

                              {/* Title */}
                              <span className={cn(
                                'block pr-4 text-xs font-medium leading-snug transition-colors duration-200',
                                isDone ? 'text-emerald-500' : 'text-foreground/80 group-hover:text-foreground',
                              )}>
                                {item.title}
                              </span>
                            </button>
                          );
                        })}
                        {group.items.length === 0 && (
                          <p className="col-span-full py-1 text-xs text-muted-foreground">
                            No items — configure to add some.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {routine.groups.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No groups yet.{' '}
                    <button type="button" onClick={() => setConfigRoutineId(routine.id)} className="text-primary hover:underline">
                      Configure
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {configRoutineId && configRoutineId !== '__new__' && (
        <RoutineConfigModal
          routine={routines.find((r) => r.id === configRoutineId) ?? null}
          onClose={() => setConfigRoutineId(null)}
          onUpdate={(updated) => {
            setRoutines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setConfigRoutineId(null);
          }}
          onDelete={(id) => {
            setRoutines((prev) => prev.filter((r) => r.id !== id));
            setStatusMap((m) => { const n = { ...m }; delete n[id]; return n; });
            setConfigRoutineId(null);
          }}
        />
      )}

      {historyRoutineId && (
        <RoutineHistoryModal
          routine={routines.find((r) => r.id === historyRoutineId)!}
          onClose={() => setHistoryRoutineId(null)}
        />
      )}
    </>
  );
}
