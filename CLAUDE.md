# 灵弈 (LingYi) — 中国象棋 AI 教练系统

## 产品定位

**伴生式 AI 教练，而非棋盘平台。** 不做独立棋盘，不做天天象棋的对手。专注"棋谱分析 + AI 灵魂教练"。

- C 端：微信小程序，AI 评语分享到群聊 = 病毒传播
- B 端：Web 端，棋校 SaaS，批量棋谱分析

## 核心产品哲学

- **伴生而非竞争**：不做新棋盘，做已有棋谱的分析放大器
- **用户即主体**：用户永远是控制者，AI 是灵魂导师而非代理人。任何 AI 自动化行为必须有显式的用户关闭入口
- **评语即产品**：AI 教练的产出应当是"用户愿意主动分享到微信群"的内容

## 架构原则：四层 Agent-Guard 矩阵

项目在所有层面上严格遵循 **"Agent 提案，Guard 拒绝"** 的分层防线：

| 层次 | Agent（提案层） | Guard（拒绝层） |
| :--- | :--- | :--- |
| **象棋引擎 (`lingyi-core`)** | `moves.rs`：生成伪合法走法 (`pseudo_legal_moves`) | `game.rs`：过滤非法走法与将军检测 (`legal_moves`, `in_check`) |
| **AI 教练 (`lingyi-agent`)** | `prompt.rs`：动态拼接 LLM 提示词上下文 | 后端过滤层：校验评语坐标合法性、幻觉拦截、频次控制 |
| **用户控制（前端）** | 无条件服从用户意图 | 前端设置面板：用户拥有一键关闭 AI 自动评语的绝对控制权 |
| **Web3 经济（未来）** | Agent 发起支付提案（任务 + 预算 + 收款方） | 智能合约 Guard：预算内 + 白名单 + 用户签名确认 |

> Agent 只有提案权，没有执行权。每一条 Guard 都对应一个用户可见的关闭入口。Web3 层赋予经济能力，Guard 赋予经济边界。

## Agent Identity（横切面）

Agent Identity 不是名字，而是**可验证身份声明**。作为四层的横切面，Identity 让用户、服务和其他 Agent 能验证：它是谁、谁控制它、能做什么、入口在哪、历史能否追溯。

核心类型（`crates/lingyi-protocol`）：

```
AgentIdentity {
    iss:         DID of issuer (signer)
    sub:         Agent unique ID (DID)
    controller:  User DID who controls this Agent
    capabilities: Vec<Capability> { action, resource }
    endpoint:    Service URI (optional)
    provenance:  Parent agent / deploy tx hash (optional)
    issued_at:   ISO 8601
    expires_at:  ISO 8601 (optional)
    signature:   Issuer's cryptographic signature (optional)
}

AgentProposal {
    identity:    AgentIdentity
    action:      String
    payload:     JSON Value
    budget:      Option<Budget> { max_tokens, max_compute, max_payment, currency }
    nonce:       u64 (replay prevention)
    timestamp:   ISO 8601
}
```

Guard 验证流程：
1. 验签 `identity.signature` — Agent 确实声称的实体
2. 能力检查 — `action` 是否在 `capabilities` 白名单内
3. 预算校验 — `budget` 是否在 controller 授予的限额内
4. 防重放 — `nonce` 是否已消费

## MVP 用户故事

> 一个卡在 1600 分的业余棋手，打开灵弈小程序 → 粘贴一局在天天象棋下输的棋谱（FEN）→ AI 教练 3 秒内给出三条毒舌评语，指出"中局计算深度不足"和"优势局面松懈"的老毛病 → 评语截图发到棋友群，群里炸了 → 一周后养成了每局必复盘的习惯。

**验证标准：**
- 粘贴 FEN → 解析 → 评分 → 输出三条评语，全链路 < 5 秒
- 评语有"毒舌感"，用户愿意分享

## 技术栈

- **核心引擎**：Rust (`lingyi-core`)，纯逻辑，wasm-pack 编译 WASM
- **协议层**：Rust (`lingyi-protocol`)，游戏无关的序列化类型
- **AI 后端**：Rust (`lingyi-agent`)，Tokio + DeepSeek API
- **前端**：Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **AI 评语**：Server-Sent Events (SSE) 流式返回

## 工作空间结构

```
lingyi/
├── Cargo.toml              # workspace root
├── CLAUDE.md               # 项目宪法
├── crates/
│   ├── lingyi-protocol/    # 共享协议类型 (game-agnostic)
│   ├── lingyi-core/        # 棋类引擎 (纯 Rust，可编译 WASM)
│   │   ├── src/wasm.rs     # WASM 桥接模块 (feature gate)
│   │   └── pkg/            # wasm-pack 生成的前端包
│   └── lingyi-agent/       # 后端：AI 编排、prompt 管理
├── apps/
│   └── web/                # 前端 (Next.js 16 + shadcn/ui)
│       ├── src/
│       │   ├── app/        # App Router 页面
│       │   ├── components/ # shadcn/ui 组件
│       │   └── lib/        # WASM 加载器 + TypeScript 类型契约
│       └── public/wasm/    # wasm-pack 输出 (46KB，静态服务)
```

## 新增前端功能库

### 音效系统 (`apps/web/src/lib/sound.ts`)
- Web Audio API beep: `playMove`, `playCapture`, `playCheck`, `playCheckmate`, `playStalemate`, `playSelect`
- TTS: `speakNotation(text)` — zh-CN 语音播报中文棋谱
- 全局开关: `setSoundEnabled()`, `setSpeechEnabled()`

### 中文棋谱 (`apps/web/src/lib/notation.ts`)
- `moveToNotation(fromRow, fromCol, toRow, toCol, pieceType, side)` → 如 "炮二平五"
- 列号映射: 红方=9-col, 黑方=col+1
- 线性棋子(车/炮/兵/将)用步数, 非线性用目标列号

### 古谱开局库 (`apps/web/src/lib/opening-book.ts` + `classic-games.json`)
- 25 个经典局面（梅花谱、桔中秘、适情雅趣）
- `lookup(fen)` → 最佳走法列表
- AI 走棋时优先匹配开局库

### AI 学习系统 (`apps/web/src/lib/ai-training.ts`)
- 对局记录: localStorage 持久化, 上限 100 局
- 错误分析: score drop >150=major, >300=blunder
- 弱点总结: 分开局/中局/残局三阶段

### 棋盘视觉常量（`page.tsx`）
```
BASE_CELL=38, BASE_MARGIN=18
ROSE_WOOD='#5c2e16', GOLD_LINE='#c9a84c', GOLD_GLOW='rgba(201,168,76,0.3)'
```
响应式缩放：ResizeObserver → CSS transform:scale()

## WASM ↔ 前端数据契约

所有 WASM 导出的复杂返回值以 JSON 字符串格式传递，避免 Mini Program 环境下 JsValue 兼容问题。

**输入**: FEN 字符串（如 `"rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"`）

**输出类型**：

```typescript
// fen_to_json() 的返回值
interface BoardState {
  fen: string;
  rows: (null | {
    piece_type: "King" | "Advisor" | "Bishop" | "Rook" | "Knight" | "Cannon" | "Pawn";
    side: "red" | "black";
  })[][];
  side_to_move: "red" | "black";
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

// get_legal_moves() 的返回值
interface Move {
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
  piece_type: string;
  side: string;
}

// evaluate() 返回值
type EvalScore = number;  // 正数 = 红方优势
```

**导出的 WASM 函数签名**：
```
fen_to_json(fen: string) → string         // JSON: BoardState
get_legal_moves(fen: string) → string       // JSON: Move[]
make_move(fen, from_row, from_col, to_row, to_col) → string  // 新 FEN
is_check(fen: string) → boolean
is_checkmate(fen: string) → boolean
is_stalemate(fen: string) → boolean
evaluate(fen: string) → number
```

## 开发规范

- 无注释政策：代码只标注 WHY，不标注 WHAT
- 三层相似胜于过早抽象
- 无半成品实现：不做任务范围外的功能、重构、抽象
- 无用代码彻底删除，不留 re-export、`_` 前缀变量、`// removed` 注释
- 默认选择最简单可用的方案

## 运行方式

```bash
# AI 教练 CLI 测试
export DEEPSEEK_API_KEY=sk-xxx
cargo run -p lingyi-agent

# WASM 编译
wasm-pack build crates/lingyi-core --target web -- --features wasm

# 前端开发 (Next.js 16)
cd apps/web && npm run dev

# 前端构建验证
cd apps/web && npx next build

# E2E 测试（需先启动 dev server）
node apps/web/e2e/board-interactive.spec.mjs

# WASM 重新编译后更新前端
cp crates/lingyi-core/pkg/lingyi_core_bg.wasm apps/web/public/wasm/
cp crates/lingyi-core/pkg/lingyi_core.js apps/web/public/wasm/
cp crates/lingyi-core/pkg/lingyi_core.d.ts apps/web/public/wasm/```

## WASM 加载说明

前端 `wasm.ts` 通过 patch `import.meta.url` 加载 WASM：
```
new URL('wasm', import.meta.url) → '/wasm/lingyi_core_bg.wasm'
```
`new Function()` 作用域中 `import.meta.url` 未定义，需替换为静态路径。

## E2E 测试

`apps/web/e2e/board-interactive.spec.mjs` — 20 个测试用例：
1. WASM 引擎初始化（加载就绪、无页面错误、显示红方先走、评估分 0）
2. 选中与走法提示（点棋子显示提示、点另一棋子重选、点空位取消）
3. 走棋执行（走棋后切换走棋方、评估正常）
4. 预设场景（切换到劣势/优势/跳马布局）
5. FEN 文本输入（输入自定义 FEN 更新棋盘）
6. 重新开局（回到初始局面）
7. AI 人机模式（模式切换、难度选择、AI 自动回应、切回双人）
