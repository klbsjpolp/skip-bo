import { build } from 'esbuild';

await build({
  bundle: true,
  entryPoints: [
    'src/handlers/http/createRoom.ts',
    'src/handlers/http/joinRoom.ts',
    'src/handlers/ws/connect.ts',
    'src/handlers/ws/disconnect.ts',
    'src/handlers/ws/message.ts',
  ],
  format: 'cjs',
  outdir: 'dist',
  platform: 'node',
  sourcemap: true,
  target: 'node20',
});
