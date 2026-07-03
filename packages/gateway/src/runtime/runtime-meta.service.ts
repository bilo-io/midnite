import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RuntimeMetaRepository } from './runtime-meta.repository';

/**
 * Phase 54 E — the runtime lifecycle marker. On boot it reads the *previous*
 * run's final state (was the last stop graceful?) and then stamps this run as
 * not-yet-drained (`clean=false`). The graceful-shutdown drain calls
 * {@link markCleanShutdown} to flip it. So a `clean=false` value observed at the
 * next boot means the previous process crashed / was hard-killed without draining.
 */
@Injectable()
export class RuntimeMetaService implements OnModuleInit {
  private readonly logger = new Logger(RuntimeMetaService.name);
  /** The previous run's final marker, captured before this run overwrites it. */
  private previous: { clean: boolean; shutdownAt: string | null; startedAt: string } | null = null;

  constructor(private readonly repo: RuntimeMetaRepository) {}

  onModuleInit(): void {
    try {
      const prior = this.repo.read();
      this.previous = prior
        ? { clean: prior.clean, shutdownAt: prior.shutdownAt, startedAt: prior.startedAt }
        : null;
      if (this.previous && !this.previous.clean) {
        this.logger.warn(
          `previous shutdown was not clean — the last process ended without draining (started ${this.previous.startedAt})`,
        );
      }
      this.repo.stampStarted(new Date().toISOString());
    } catch (err) {
      // Fail-open: a marker error must never block boot.
      this.logger.warn(`runtime-meta boot stamp failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  /** Record that this process is shutting down gracefully (called by the drain). */
  markCleanShutdown(): void {
    try {
      this.repo.markClean(new Date().toISOString());
    } catch (err) {
      this.logger.warn(`runtime-meta clean-shutdown mark failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  /** Whether the *previous* run shut down cleanly — null on a first-ever boot.
   *  Read by Theme F's status surface. */
  previousShutdownClean(): boolean | null {
    return this.previous ? this.previous.clean : null;
  }
}
