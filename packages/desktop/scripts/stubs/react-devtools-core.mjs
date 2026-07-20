// No-op stub for `react-devtools-core` (Phase 77). ink statically imports it but only
// calls it when DEV is set, and it's an *optional* dep that isn't installed — so when
// esbuild-bundling the CLI into a single file we alias it here to avoid an unresolved
// import (and a runtime ERR_MODULE_NOT_FOUND) for a devtools path the bundled CLI never
// takes.
export function connectToDevTools() {}
export function connectWithCustomMessagingProtocol() {}
export default {};
