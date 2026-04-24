#!/bin/bash
# Run scoped lint + typecheck for the package containing the edited file
python3 - << 'EOF'
import sys, json, os, subprocess

d = json.load(sys.stdin)
p = os.path.relpath(d.get('file_path', ''), os.getcwd())

pkg_map = {
    'apps/web/':                      '@skipbo/web',
    'apps/realtime-api/':             '@skipbo/realtime-api',
    'packages/game-core/':            '@skipbo/game-core',
    'packages/multiplayer-protocol/': '@skipbo/multiplayer-protocol',
}

pkg = next((v for k, v in pkg_map.items() if p.startswith(k)), None)
if not pkg:
    sys.exit(0)

print(f'[hook] lint + typecheck {pkg}', flush=True)
r1 = subprocess.run(['pnpm', '--filter', pkg, 'lint'],       capture_output=True, text=True)
r2 = subprocess.run(['pnpm', '--filter', pkg, 'typecheck'],  capture_output=True, text=True)

for r in [r1, r2]:
    if r.stdout: print(r.stdout, end='')
    if r.stderr: print(r.stderr, end='', file=sys.stderr)

sys.exit(max(r1.returncode, r2.returncode))
EOF
