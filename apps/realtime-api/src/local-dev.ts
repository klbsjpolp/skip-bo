import { startLocalRealtimeDevServer } from './local/devServer.js';

const host = process.env.SKIPBO_LOCAL_API_HOST ?? '127.0.0.1';
const port = process.env.SKIPBO_LOCAL_API_PORT
  ? Number.parseInt(process.env.SKIPBO_LOCAL_API_PORT, 10)
  : 8787;
const publicHost = process.env.SKIPBO_LOCAL_API_PUBLIC_HOST ?? host;

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid SKIPBO_LOCAL_API_PORT: ${process.env.SKIPBO_LOCAL_API_PORT}`);
}

const server = await startLocalRealtimeDevServer({
  host,
  port,
  publicHost,
});

console.info(`[realtime-api] local HTTP server listening on ${server.httpUrl}`);
console.info(`[realtime-api] local WebSocket server listening on ${server.wsUrl}`);
console.info(`[realtime-api] run the web app with VITE_SKIPBO_API_URL=${server.httpUrl}`);

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
