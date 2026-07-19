// Harness-private ports/origins for the admin Playwright flow specs. Chosen off
// web's range (3000/7777) so the two apps' e2e runs can coexist.
export const E2E_GATEWAY_PORT = 7788;
export const E2E_ADMIN_PORT = 3110;

export const GATEWAY_ORIGIN = `http://127.0.0.1:${E2E_GATEWAY_PORT}`;
export const ADMIN_ORIGIN = `http://127.0.0.1:${E2E_ADMIN_PORT}`;
