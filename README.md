# 灵弈 (LingYi) — 中国象棋 AI 教练系统

伴生式 AI 教练，专注棋谱分析与 AI 灵魂导师。

**不是棋盘平台**，不做独立棋盘，不做天天象棋的对手。插件化接入已有平台（天天象棋、腾讯棋牌等），做分析放大器。

## 功能

- **PVP / PVE 双模式** — 同设备双人对弈，或人机对战（3 级难度）
- **AI 搜索引擎** — Negamax + alpha-beta 剪枝，WASM 本地运行
- **古谱开局库** — 内置 25 个经典局面（梅花谱、桔中秘、适情雅趣）
- **中文棋谱播报** — TTS 语音朗读每一步的中文棋谱
- **音效反馈** — 走棋、吃子、将军、将杀均有音效
- **对局分析** — 自动记录对局，分析错误、总结弱点
- **红木视觉主题** — 红木棋盘 + 金色网格线 + 质感棋子
- **FEN 导入 / 预设场景** — 粘贴 FEN 字符串，或一键切换到经典局面

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| **核心引擎** | Rust (`lingyi-core`)，编译 WASM |
| **协议层** | Rust (`lingyi-protocol`) |
| **AI 后端** | Rust (`lingyi-agent`), Tokio + DeepSeek API |
| **前端** | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| **音效** | Web Audio API + Web Speech API |

## 项目结构

```
lingyi/
├── crates/
│   ├── lingyi-protocol/  # 共享协议类型
│   ├── lingyi-core/      # 象棋引擎 + WASM 桥接
│   └── lingyi-agent/     # AI 后端编排
├── apps/
│   └── web/              # Next.js 16 前端
└── .github/workflows/    # CI/CD
```

## 快速开始

### 前置要求

- Rust 1.85+
- Node.js 22+
- wasm-pack（可选，仅 WASM 编译需要）

### 安装 & 运行

```bash
# 安装前端依赖
cd apps/web && npm install

# 启动开发服务器
cd apps/web && npm run dev
```

浏览器打开 `http://localhost:3000`。

### WASM 编译（修改引擎后需要）

```bash
wasm-pack build crates/lingyi-core --target web -- --features wasm
cp crates/lingyi-core/pkg/lingyi_core_bg.wasm apps/web/public/wasm/
cp crates/lingyi-core/pkg/lingyi_core.js apps/web/public/wasm/
cp crates/lingyi-core/pkg/lingyi_core.d.ts apps/web/public/wasm/
```

### 运行测试

```bash
# Rust 单元测试
cargo test -p lingyi-core

# 前端构建验证
cd apps/web && npx next build

# E2E 测试（需先启动 dev server）
node apps/web/e2e/board-interactive.spec.mjs
```

## 开发日志

参见 [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) — 记录了开发过程中遇到的所有问题以及解决方案。

## 贡献

参见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

MIT
