#!/bin/bash
# Block edits to protected files: .env, pnpm-lock.yaml, visual test snapshots
python3 - << 'EOF'
import sys, json, os

d = json.load(sys.stdin)
p = os.path.relpath(d.get('file_path', ''), os.getcwd())

protected = ['.env', 'pnpm-lock.yaml', '-snapshots/']
for guard in protected:
    if guard in p:
        print(f'Hook blocked: {p!r} is protected ({guard}). Edit manually if intentional.')
        sys.exit(2)
EOF
