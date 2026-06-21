import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { CreateRepoRequest, MidniteConfig, Repo, UpdateRepoRequest } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import type { RepoInsert, RepoRow } from '../db/schema';
import { collapseTilde, expandTilde } from '../fs/path-tilde';
import { ReposRepository } from './repos.repository';

/** Thrown when a create/rename would collide with an existing repo name. */
export class RepoNameTakenError extends Error {}
/** Thrown when an id doesn't resolve to a repo. */
export class RepoDoesNotExistError extends Error {}

@Injectable()
export class ReposService implements OnModuleInit {
  private readonly logger = new Logger(ReposService.name);

  constructor(
    @Inject(ReposRepository) private readonly repo: ReposRepository,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  // Seed the registry from `config.repos` on boot, insert-if-absent by name.
  // After seeding the DB is the runtime source of truth — we never overwrite a
  // DB row from config and never delete (Phase 13 Decision §2 / A3).
  onModuleInit(): void {
    for (const r of this.config.repos) {
      if (this.repo.getByName(r.name)) continue;
      const now = new Date().toISOString();
      this.repo.insert({
        id: randomUUID(),
        name: r.name,
        path: normalizePath(r.path),
        createdAt: now,
        updatedAt: now,
      });
      this.logger.log(`seeded repo "${r.name}" from config`);
    }
  }

  list(): Repo[] {
    return this.repo.list().map(toRepo);
  }

  get(id: string): Repo {
    const row = this.repo.getById(id);
    if (!row) throw new RepoDoesNotExistError(`repo ${id} not found`);
    return toRepo(row);
  }

  /** Resolve a repo by its registry-unique name; used by terminal cwd resolution. */
  findByName(name: string): Repo | undefined {
    const row = this.repo.getByName(name);
    return row ? toRepo(row) : undefined;
  }

  create(req: CreateRepoRequest): Repo {
    if (this.repo.getByName(req.name)) {
      throw new RepoNameTakenError(`a repo named "${req.name}" already exists`);
    }
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      name: req.name,
      path: normalizePath(req.path),
      createdAt: now,
      updatedAt: now,
    });
    return toRepo(row);
  }

  update(id: string, req: UpdateRepoRequest): Repo {
    const existing = this.repo.getById(id);
    if (!existing) throw new RepoDoesNotExistError(`repo ${id} not found`);
    if (req.name !== undefined && req.name !== existing.name) {
      const clash = this.repo.getByName(req.name);
      if (clash && clash.id !== id) {
        throw new RepoNameTakenError(`a repo named "${req.name}" already exists`);
      }
    }
    const patch: Partial<RepoInsert> = { updatedAt: new Date().toISOString() };
    if (req.name !== undefined) patch.name = req.name;
    if (req.path !== undefined) patch.path = normalizePath(req.path);
    const row = this.repo.update(id, patch);
    if (!row) throw new RepoDoesNotExistError(`repo ${id} not found`);
    return toRepo(row);
  }

  delete(id: string): void {
    if (!this.repo.getById(id)) throw new RepoDoesNotExistError(`repo ${id} not found`);
    this.repo.delete(id);
  }
}

function toRepo(row: RepoRow): Repo {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Store paths in `~`-form: expand any ~, resolve to absolute, then collapse the
// home prefix back. Portable storage, consistent with project workDir; the
// terminal expands it back to absolute when resolving a session's cwd.
function normalizePath(input: string): string {
  return collapseTilde(resolve(expandTilde(input.trim())));
}
