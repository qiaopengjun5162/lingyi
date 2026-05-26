# 灵弈 (LingYi) — 一键本地开发 / 验证

# ─── 完整检查（提交前跑这个就够了） ───
check: test clippy lint build

# ─── Rust ───
@test:
    cargo test -p lingyi-core

@clippy:
    cargo clippy -p lingyi-core -- -D warnings

# ─── 前端 ───
@lint: clippy
    cd apps/web && npx eslint src/

@build: wasm
    cd apps/web && npx next build

# ─── WASM ───
wasm:
    wasm-pack build crates/lingyi-core --target web -- --features wasm
    cp crates/lingyi-core/pkg/lingyi_core_bg.wasm apps/web/public/wasm/
    cp crates/lingyi-core/pkg/lingyi_core.js apps/web/public/wasm/
    cp crates/lingyi-core/pkg/lingyi_core.d.ts apps/web/public/wasm/

# ─── E2E（需要先启动 dev server） ───
@e2e:
    node apps/web/e2e/board-interactive.spec.mjs

# ─── 全部测试（含 E2E，会提示启动 dev server） ───
@full: test clippy lint build
    echo ""
    echo "⚠️  请确保 dev server 已启动 (npm run dev)，然后按回车运行 E2E..."
    @read _
    node apps/web/e2e/board-interactive.spec.mjs

# ─── 自动修复 ───
@fix: clippy
    cd apps/web && npx eslint src/ --fix

# ─── 帮助 ───
@default:
    @echo "灵弈 开发命令"
    @echo ""
    @echo "  just check    测试 + clippy + lint + build（提交前跑这个）"
    @echo "  just full     check + E2E（含浏览器测试）"
    @echo "  just test     Rust 单元测试"
    @echo "  just clippy   Rust clippy 检查"
    @echo "  just lint     前端 ESLint 检查"
    @echo "  just wasm     WASM 编译并复制到前端"
    @echo "  just build    WASM + Next.js build"
    @echo "  just e2e      E2E 浏览器测试"
    @echo "  just fix      自动修复可修问题"
