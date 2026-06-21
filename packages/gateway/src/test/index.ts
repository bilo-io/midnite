// Shared gateway test helpers — one obvious setup path for new feature tests.
//
// Scope note: gateway specs wire collaborators by direct instantiation with
// `vi.fn()` fakes (see the controller/pool/integration specs), not a Nest DI
// testing container — so `@nestjs/testing` is intentionally not a dependency.
// What every spec genuinely repeats is the migrated `:memory:` database setup;
// that's what this module consolidates.
export { createTestDb, type TestDbHandle } from './db';
