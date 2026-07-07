import { startMockRelayServer } from './mockRelayServer.ts';

/**
 * Standalone runner for manual multiplayer testing without the AWS backend:
 *
 *   pnpm --filter @skipbo/web mock:relay          # default port 8787
 *   MOCK_RELAY_PORT=9000 pnpm --filter @skipbo/web mock:relay
 *
 * Then point the web app at it:
 *
 *   VITE_SKIPBO_API_URL=http://127.0.0.1:8787 pnpm dev
 *
 * and open two browser tabs (host + guest).
 */
const port = Number(process.env.MOCK_RELAY_PORT ?? 8787);

const server = await startMockRelayServer({ port, shuffleSeats: true });
console.info(`Mock relay server listening on ${server.apiBaseUrl}`);
console.info(`Start the app with: VITE_SKIPBO_API_URL=${server.apiBaseUrl} pnpm dev`);

const shutdown = () => {
  void server.close().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
