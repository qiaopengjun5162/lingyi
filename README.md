# LingYi — Chinese Chess AI Coach

A companion-style AI coach for Xiangqi (Chinese Chess), focused on game analysis and AI-powered mentorship.

**Not a standalone chessboard platform.** LingYi plugs into existing platforms (Tencent Chess, etc.) as an analysis amplifier.

## Features

- **PVP / PVE modes** — Local two-player or play against AI (3 difficulty levels)
- **AI search engine** — Negamax + alpha-beta pruning, runs locally via WASM
- **Classic opening book** — 25 built-in classic positions from 梅花谱, 桔中秘, 适情雅趣
- **Chinese notation TTS** — Speech synthesis reads each move in Chinese notation
- **Sound effects** — Audio feedback for move, capture, check, checkmate
- **Game analysis** — Auto-record games, analyze mistakes, summarize weaknesses
- **Rosewood visual theme** — Wood-textured board with golden grid lines
- **FEN import / presets** — Paste FEN strings or switch to classic positions

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Engine** | Rust (`lingyi-core`), compiled to WASM |
| **Protocol** | Rust (`lingyi-protocol`) |
| **AI Backend** | Rust (`lingyi-agent`), Tokio + DeepSeek API |
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| **Audio** | Web Audio API + Web Speech API |

## Project Structure

```
lingyi/
├── crates/
│   ├── lingyi-protocol/  # Shared protocol types
│   ├── lingyi-core/      # Chess engine + WASM bridge
│   └── lingyi-agent/     # AI backend orchestration
├── apps/
│   └── web/              # Next.js 16 frontend
└── .github/workflows/    # CI/CD
```

## Quick Start

### Prerequisites

- Rust 1.85+
- Node.js 22+
- wasm-pack (optional, only for WASM rebuilds)

### Install & Run

```bash
# Install frontend dependencies
cd apps/web && npm install

# Start dev server
cd apps/web && npm run dev
```

Open `http://localhost:3000` in your browser.

### Rebuild WASM (after engine changes)

```bash
wasm-pack build crates/lingyi-core --target web -- --features wasm
cp crates/lingyi-core/pkg/lingyi_core_bg.wasm apps/web/public/wasm/
cp crates/lingyi-core/pkg/lingyi_core.js apps/web/public/wasm/
cp crates/lingyi-core/pkg/lingyi_core.d.ts apps/web/public/wasm/
```

### Run Tests

```bash
# Rust unit tests
cargo test -p lingyi-core

# Frontend build
cd apps/web && npx next build

# E2E tests (requires dev server running)
node apps/web/e2e/board-interactive.spec.mjs
```

## Development Log

See [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) — a record of all problems encountered and solutions found during development.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
