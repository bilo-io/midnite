import { Global, Module } from '@nestjs/common';
import { RuntimeMetaRepository } from './runtime-meta.repository';
import { RuntimeMetaService } from './runtime-meta.service';

/**
 * Phase 54 E — the runtime lifecycle marker (clean-shutdown tracking). `@Global`
 * so the drain (pool) and later the status surface (Theme F) can inject
 * `RuntimeMetaService` without importing this module everywhere; it depends only
 * on the (global) DB handle.
 */
@Global()
@Module({
  providers: [RuntimeMetaRepository, RuntimeMetaService],
  exports: [RuntimeMetaService],
})
export class RuntimeMetaModule {}
