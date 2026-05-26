#!/usr/bin/env bash
set -euo pipefail

echo "=== 灵弈 pre-commit 检查 ==="

# ── Rust ──
echo ""
echo "→ cargo test..."
cargo test -p lingyi-core 2>&1 | tail -2

echo ""
echo "→ cargo clippy..."
cargo clippy -p lingyi-core -- -D warnings 2>&1 | tail -1

# ── 前端 ──
echo ""
echo "→ ESLint..."
cd apps/web
npx eslint src/ 2>&1 | tail -1
cd "$OLDPWD"

echo ""
echo "→ Next.js build..."
cd apps/web
npx next build 2>&1 | tail -3
cd "$OLDPWD"

echo ""
echo "=== pre-commit 全部通过 ==="
