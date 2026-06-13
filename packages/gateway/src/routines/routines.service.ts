import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CreateGroupRequest,
  CreateItemRequest,
  CreateRoutineRequest,
  RecordProgressRequest,
  Routine,
  RoutineProgress,
  UpdateGroupRequest,
  UpdateItemRequest,
  UpdateRoutineRequest,
} from '@midnite/shared';
import { RoutinesRepository } from './routines.repository';

@Injectable()
export class RoutinesService {
  constructor(@Inject(RoutinesRepository) private readonly repo: RoutinesRepository) {}

  listRoutines(): Routine[] {
    return this.repo.listRoutines().map((r) => this.repo.hydrateRoutine(r));
  }

  getRoutine(id: string): Routine {
    const row = this.repo.getRoutine(id);
    if (!row) throw new NotFoundException(`routine ${id} not found`);
    return this.repo.hydrateRoutine(row);
  }

  createRoutine(req: CreateRoutineRequest): Routine {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.repo.insertRoutine({ id, name: req.name, createdAt: now, updatedAt: now });

    for (const [gi, g] of (req.groups ?? []).entries()) {
      const gid = randomUUID();
      this.repo.insertGroup({ id: gid, routineId: id, name: g.name, position: gi, createdAt: now, updatedAt: now });
      for (const [ii, item] of g.items.entries()) {
        this.repo.insertItem({ id: randomUUID(), groupId: gid, title: item.title, position: ii, createdAt: now, updatedAt: now });
      }
    }

    return this.getRoutine(id);
  }

  updateRoutine(id: string, req: UpdateRoutineRequest): Routine {
    if (!this.repo.getRoutine(id)) throw new NotFoundException(`routine ${id} not found`);
    if (req.name !== undefined) {
      this.repo.updateRoutine(id, { name: req.name, updatedAt: new Date().toISOString() });
    }
    return this.getRoutine(id);
  }

  removeRoutine(id: string): void {
    if (!this.repo.getRoutine(id)) throw new NotFoundException(`routine ${id} not found`);
    this.repo.deleteRoutine(id);
  }

  // ---- Groups ----

  addGroup(routineId: string, req: CreateGroupRequest): Routine {
    if (!this.repo.getRoutine(routineId)) throw new NotFoundException(`routine ${routineId} not found`);
    const now = new Date().toISOString();
    const position = this.repo.maxGroupPosition(routineId) + 1;
    this.repo.insertGroup({ id: randomUUID(), routineId, name: req.name, position, createdAt: now, updatedAt: now });
    return this.getRoutine(routineId);
  }

  updateGroup(routineId: string, groupId: string, req: UpdateGroupRequest): Routine {
    this.assertRoutineAndGroup(routineId, groupId);
    const patch: Parameters<RoutinesRepository['updateGroup']>[1] = { updatedAt: new Date().toISOString() };
    if (req.name !== undefined) patch.name = req.name;
    if (req.position !== undefined) patch.position = req.position;
    this.repo.updateGroup(groupId, patch);
    return this.getRoutine(routineId);
  }

  removeGroup(routineId: string, groupId: string): Routine {
    this.assertRoutineAndGroup(routineId, groupId);
    this.repo.deleteGroup(groupId);
    return this.getRoutine(routineId);
  }

  // ---- Items ----

  addItem(routineId: string, groupId: string, req: CreateItemRequest): Routine {
    if (!this.repo.getRoutine(routineId)) throw new NotFoundException(`routine ${routineId} not found`);
    if (!this.repo.getGroup(groupId)) throw new NotFoundException(`group ${groupId} not found`);
    const now = new Date().toISOString();
    const position = this.repo.maxItemPosition(groupId) + 1;
    this.repo.insertItem({ id: randomUUID(), groupId, title: req.title, position, createdAt: now, updatedAt: now });
    return this.getRoutine(routineId);
  }

  updateItem(routineId: string, itemId: string, req: UpdateItemRequest): Routine {
    if (!this.repo.getRoutine(routineId)) throw new NotFoundException(`routine ${routineId} not found`);
    if (!this.repo.getItem(itemId)) throw new NotFoundException(`item ${itemId} not found`);
    const patch: Parameters<RoutinesRepository['updateItem']>[1] = { updatedAt: new Date().toISOString() };
    if (req.title !== undefined) patch.title = req.title;
    if (req.position !== undefined) patch.position = req.position;
    this.repo.updateItem(itemId, patch);
    return this.getRoutine(routineId);
  }

  removeItem(routineId: string, itemId: string): Routine {
    if (!this.repo.getRoutine(routineId)) throw new NotFoundException(`routine ${routineId} not found`);
    if (!this.repo.getItem(itemId)) throw new NotFoundException(`item ${itemId} not found`);
    this.repo.deleteItem(itemId);
    return this.getRoutine(routineId);
  }

  // ---- Progress ----

  recordProgress(routineId: string, req: RecordProgressRequest): RoutineProgress {
    const routine = this.repo.getRoutine(routineId);
    if (!routine) throw new NotFoundException(`routine ${routineId} not found`);

    const hydratedRoutine = this.repo.hydrateRoutine(routine);
    const now = new Date().toISOString();

    // Build snapshot from current config, overlaying the provided itemStatus
    const snapshot = {
      groups: hydratedRoutine.groups.map((g) => ({
        id: g.id,
        name: g.name,
        items: g.items.map((item) => ({
          id: item.id,
          title: item.title,
          done: req.itemStatus[item.id] ?? false,
        })),
      })),
    };

    const existing = this.repo.getProgress(routineId, req.date);
    const row = this.repo.upsertProgress({
      id: existing?.id ?? randomUUID(),
      routineId,
      date: req.date,
      snapshot: JSON.stringify(snapshot),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return this.repo.hydrateProgress(row);
  }

  listProgress(routineId: string, from?: string, to?: string): RoutineProgress[] {
    if (!this.repo.getRoutine(routineId)) throw new NotFoundException(`routine ${routineId} not found`);
    const today = new Date().toISOString().slice(0, 10);
    const start = from ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return d.toISOString().slice(0, 10);
    })();
    const end = to ?? today;
    return this.repo.listProgress(routineId, start, end).map((r) => this.repo.hydrateProgress(r));
  }

  // ---- Helpers ----

  private assertRoutineAndGroup(routineId: string, groupId: string): void {
    if (!this.repo.getRoutine(routineId)) throw new NotFoundException(`routine ${routineId} not found`);
    const group = this.repo.getGroup(groupId);
    if (!group || group.routineId !== routineId) throw new NotFoundException(`group ${groupId} not found`);
  }
}
