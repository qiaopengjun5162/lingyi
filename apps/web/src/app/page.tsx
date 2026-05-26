'use client';

/**
 * 中国象棋棋盘页面 — 灵弈 (LingYi)
 *
 * 棋盘是 9×10 个交叉点（不是格子），棋子摆在交叉点上。
 * 交互流程：点选己方棋子 → 显示合法走法提示（绿点=走，红圈=吃）→ 点击目标格子走棋
 *
 * 模式：
 * - PVP（双人对弈）：同设备两人轮流操作
 * - PVE（人机对战）：人类走棋后 AI 自动回应
 *   - 入门: depth=2, 中级: depth=4, 高级: depth=6
 *
 * WASM 引擎处理全部象棋逻辑（合法走法生成、AI 搜索、局面评估），前端只负责渲染和事件。
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { BoardState, Move, GameMode, AIStats } from '@/lib/types';
import { START_FEN } from '@/lib/types';
import {
  createGame, addStep, finishGame, calculateStats,
  summarizeWeaknesses, type GameRecord,
} from '@/lib/ai-training';
import {
  fenToJson, getLegalMoves, evaluate,
  makeMove as wasmMakeMove, bestMove as wasmBestMove,
  initWasm,
} from '@/lib/wasm';
import { moveToNotation } from '@/lib/notation';
import {
  playMove, playCapture, playCheck, playCheckmate, playStalemate,
  speakNotation,
  setSoundEnabled, setSpeechEnabled,
} from '@/lib/sound';
import { lookup } from '@/lib/opening-book';

// ─── 棋盘布局常量 ───
const BASE_CELL = 38;
const BASE_MARGIN = 18;
const BOARD_W = BASE_CELL * 8;
const BOARD_H = BASE_CELL * 9;
const BASE_SVG_W = BOARD_W + BASE_MARGIN * 2;
const BASE_SVG_H = BOARD_H + BASE_MARGIN * 2;
// 红木色系
const ROSE_WOOD = '#5c2e16';
const GOLD_LINE = '#c9a84c';
const GOLD_GLOW = 'rgba(201,168,76,0.3)';

const ix = (col: number, cell: number, margin: number) => margin + col * cell;
const iy = (row: number, cell: number, margin: number) => margin + row * cell;

// 棋子中文显示名
const PIECE_CHAR: Record<string, Record<string, string>> = {
  King:    { red: '帅', black: '将' },
  Advisor: { red: '仕', black: '士' },
  Bishop:  { red: '相', black: '象' },
  Rook:    { red: '車', black: '車' },
  Knight:  { red: '馬', black: '馬' },
  Cannon:  { red: '炮', black: '炮' },
  Pawn:    { red: '兵', black: '卒' },
};

/**
 * SVG 棋盘 — 红木实木 + 黄金镶嵌网格线 + AI 微光
 */
function GridSVG({ cell, margin }: { cell: number; margin: number }) {
  const M = margin, C = cell;
  const hLines = useMemo(() => {
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let r = 0; r < 10; r++)
      lines.push({ key: `h${r}`, x1: M, y1: M + r * C, x2: M + 8 * C, y2: M + r * C });
    return lines;
  }, [M, C]);

  const vLines = useMemo(() => {
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let c = 0; c < 9; c++) {
      if (c === 0 || c === 8)
        lines.push({ key: `v${c}`, x1: M + c * C, y1: M, x2: M + c * C, y2: M + 9 * C });
      else {
        lines.push({ key: `v${c}t`, x1: M + c * C, y1: M, x2: M + c * C, y2: M + 4 * C });
        lines.push({ key: `v${c}b`, x1: M + c * C, y1: M + 5 * C, x2: M + c * C, y2: M + 9 * C });
      }
    }
    return lines;
  }, [M, C]);

  return (
    <svg viewBox={`0 0 ${BASE_SVG_W} ${BASE_SVG_H}`}
      className="absolute top-0 left-0 pointer-events-none select-none"
      width="100%" height="100%">
      <defs>
        <filter id="gold-glow">
          <feDropShadow dx={0} dy={0} stdDeviation={1.5} floodColor={GOLD_LINE} floodOpacity={0.4} />
        </filter>
      </defs>

      {/* 红木基底 — 仿实木纹理 gradient */}
      <rect width={BASE_SVG_W} height={BASE_SVG_H} rx={5} fill={ROSE_WOOD} />
      <rect width={BASE_SVG_W} height={BASE_SVG_H} rx={5}
        fill="linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0) 100%)" />

      {/* 外框 — 金属镶嵌效果 */}
      <rect x={M - 2} y={M - 2} width={8 * C + 4} height={9 * C + 4}
        fill="none" stroke={GOLD_LINE} strokeWidth={1.5} rx={1} filter="url(#gold-glow)" />
      <rect x={M - 0.5} y={M - 0.5} width={8 * C + 1} height={9 * C + 1}
        fill="none" stroke={GOLD_LINE} strokeWidth={0.4} rx={0.5} />

      {/* 黄金网格线 */}
      {hLines.map(l => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={GOLD_LINE} strokeWidth={0.6} opacity={0.7} />
      ))}
      {vLines.map(l => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={GOLD_LINE} strokeWidth={0.6} opacity={0.7} />
      ))}

      {/* 九宫斜线 */}
      {[[3,0,5,2],[5,0,3,2],[3,7,5,9],[5,7,3,9]].map(([x1,y1,x2,y2],i) => (
        <line key={`dg${i}`} x1={ix(x1,C,M)} y1={iy(y1,C,M)} x2={ix(x2,C,M)} y2={iy(y2,C,M)}
          stroke={GOLD_LINE} strokeWidth={0.6} opacity={0.7} />
      ))}

      {/* 楚河汉界 — 金色书法 */}
      <text x={ix(2,C,M)} y={iy(4.5,C,M)} fill={GOLD_LINE} fontSize={16} fontFamily="serif"
        textAnchor="middle" dominantBaseline="central" opacity={0.5} letterSpacing={6} fontWeight={500}>
        楚 河
      </text>
      <text x={ix(6,C,M)} y={iy(4.5,C,M)} fill={GOLD_LINE} fontSize={16} fontFamily="serif"
        textAnchor="middle" dominantBaseline="central" opacity={0.5} letterSpacing={6} fontWeight={500}>
        汉 界
      </text>
    </svg>
  );
}

// 棋子直径
const PIECE_SIZE = BASE_CELL * 0.82;

/**
 * 棋子 — 实木抛光质感 + 金属镶嵌汉字 + 选中微光
 *
 * 红木基底，黄金/铜色镂刻字符，暗合传统 × 科技感。
 */
function PieceToken({ piece_type, side, selected, cell }: { piece_type: string; side: string; selected?: boolean; cell: number }) {
  const size = cell * 0.82;
  const isRed = side === 'red';
  const char = PIECE_CHAR[piece_type]?.[side] ?? '?';
  return (
    <div className="flex items-center justify-center rounded-full cursor-pointer select-none"
      style={{
        width: size, height: size,
        fontFamily: "'Noto Serif SC', 'KaiTi', serif",
        fontSize: size * 0.52,
        fontWeight: 700,
        color: isRed ? '#c62828' : '#1a1a2e',
        textShadow: isRed
          ? '0 0 8px rgba(198,40,40,0.4), 0 1px 2px rgba(0,0,0,0.3)'
          : '0 0 8px rgba(100,100,255,0.3), 0 1px 2px rgba(0,0,0,0.3)',
        background: 'radial-gradient(circle at 35% 28%, #f5e6c8, #e8d5a0 40%, #c4943a)',
        border: `2px solid ${isRed ? '#c62828' : '#1a1a2e'}`,
        boxShadow: selected
          ? `0 0 0 3px ${GOLD_LINE}, 0 0 20px ${GOLD_GLOW}, 0 3px 10px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)`
          : '0 3px 8px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.2)',
        transition: 'box-shadow 0.2s ease',
      }}>
      {char}
    </div>
  );
}

/** 合法走法绿色小圆点 */
function MoveDot({ row, col, cell, margin }: { row: number; col: number; cell: number; margin: number }) {
  return (
    <div className="absolute z-20 pointer-events-none flex items-center justify-center"
      style={{ left: ix(col, cell, margin), top: iy(row, cell, margin), width: cell, height: cell, transform: 'translate(-50%,-50%)' }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.65)', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
    </div>
  );
}

/** 吃子红色空心圆环 */
function CaptureRing({ row, col, cell, margin }: { row: number; col: number; cell: number; margin: number }) {
  const size = cell * 0.82;
  return (
    <div className="absolute z-20 pointer-events-none flex items-center justify-center"
      style={{ left: ix(col, cell, margin), top: iy(row, cell, margin), width: cell, height: cell, transform: 'translate(-50%,-50%)' }}>
      <div style={{ width: size, height: size, borderRadius: '50%', border: '3px solid rgba(239,68,68,0.6)', backgroundColor: 'rgba(239,68,68,0.08)' }} />
    </div>
  );
}

interface MoveTargets { moves: Move[]; captures: Move[] }

const SCENES = [
  { label: '开局', fen: START_FEN },
  { label: '劣势', fen: '2bak4/4a4/4b4/9/9/9/9/4C4/3R1K3/9 w' },
  { label: '优势', fen: '4kab2/4a4/4b4/9/9/2R6/9/3R5/4K4/9 w' },
  { label: '跳马布局', fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/2N6/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w' },
];

const DIFFICULTIES = [
  { label: '入门', depth: 2 },
  { label: '中级', depth: 4 },
  { label: '高级', depth: 6 },
];

export default function Home() {
  // ─── 核心状态 ───
  const [fen, setFen] = useState(START_FEN);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [allLegalMoves, setAllLegalMoves] = useState<Move[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  // ─── 交互状态 ───
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [lastMoveDesc, setLastMoveDesc] = useState<string | null>(null);
  const [wrongSideMsg, setWrongSideMsg] = useState<string | null>(null);
  const wrongSideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── AI 模式状态 ───
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [difficulty, setDifficulty] = useState(1);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiStats, setAiStats] = useState<AIStats>({ gamesPlayed: 0, wins: 0, losses: 0, draws: 0 });
  const [soundOn, setSoundOn] = useState(true);
  const [speechOn, setSpeechOn] = useState(true);

  // 棋盘自适应缩放
  const boardScaleRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  useEffect(() => {
    const el = boardScaleRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setBoardScale(Math.min(1, w / BASE_SVG_W));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 对局记录（持久化学习数据）
  const [currentGame, setCurrentGame] = useState<GameRecord | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const currentGameRef = useRef<GameRecord | null>(null);

  // 用 ref 存最新 fen/board，避免 AI 异步回调中拿到过期数据
  const fenRef = useRef(fen);
  const boardRef = useRef(board);
  useEffect(() => { fenRef.current = fen; }, [fen]);
  useEffect(() => { boardRef.current = board; }, [board]);

  // 音效开关同步到 sound 模块
  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);
  useEffect(() => { setSpeechEnabled(speechOn); }, [speechOn]);

  /** 分析 FEN 局面 */
  const analyzeFen = (f: string) => {
    setFen(f);
    setSelected(null);
    try {
      const b = fenToJson(f);
      const moves = getLegalMoves(f);
      setBoard(b);
      setAllLegalMoves(moves);
      setMoveCount(moves.length);
      setScore(evaluate(f));

      // 检查对局是否结束 → 结束记录
      if (currentGameRef.current && (b.checkmate || b.stalemate)) {
        const result: GameRecord['result'] = b.checkmate
          ? (b.side_to_move === 'red' ? 'black_win' : 'red_win')
          : 'draw';
        finishGame(currentGameRef.current, result, f);
        currentGameRef.current = null;
        setCurrentGame(null);
        setAiStats(calculateStats());
        setWeaknesses(summarizeWeaknesses());
        if (b.checkmate) playCheckmate();
        else playStalemate();
      } else if (b.check) {
        playCheck();
      }
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  // 页面加载时初始化 WASM 引擎
  useEffect(() => {
    initWasm()
      .then(() => {
        setStatus('ready');
        analyzeFen(START_FEN);
        setAiStats(calculateStats());
        setWeaknesses(summarizeWeaknesses());
      })
      .catch((e: Error) => {
        setStatus('error');
        setError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 触发 AI 走棋（在 PVE 模式下人类走完后调用） */
  const triggerAI = useCallback(() => {
    if (!boardRef.current || !fenRef.current) return;
    const b = boardRef.current;
    const f = fenRef.current;

    if (b.side_to_move !== 'black') return;

    setAiThinking(true);

    setTimeout(() => {
      let fromRow = 0, fromCol = 0, toRow = 0, toCol = 0;
      let found = false;

      // 第 1 层：开局库匹配
      const book = lookup(f);
      if (book && book.length > 0) {
        const entry = book[Math.floor(Math.random() * book.length)];
        fromRow = entry.from_row; fromCol = entry.from_col;
        toRow = entry.to_row; toCol = entry.to_col;
        found = true;
      }

      // 第 2 层：AI 搜索
      if (!found) {
        const depth = DIFFICULTIES[difficulty].depth;
        const result = wasmBestMove(f, depth);
        if (!result) { setAiThinking(false); return; }
        fromRow = result.from_row; fromCol = result.from_col;
        toRow = result.to_row; toCol = result.to_col;
      }

      const newFen = wasmMakeMove(f, fromRow, fromCol, toRow, toCol);
      const stepScoreBefore = evaluate(f);
      const stepScoreAfter = evaluate(newFen);

      // AI 走棋的棋子类型
      const aiPiece = b.rows[fromRow]?.[fromCol];
      const notation = aiPiece
        ? moveToNotation(fromRow, fromCol, toRow, toCol, aiPiece.piece_type, 'black')
        : `黑方 ${fromRow},${fromCol}→${toRow},${toCol}`;
      setLastMoveDesc(`黑方：${notation}`);
      playMove();
      if (speechOn) speakNotation(notation);
      setAiThinking(false);
      analyzeFen(newFen);

      if (currentGameRef.current) {
        addStep(currentGameRef.current, {
          fen: f,
          fromRow, fromCol, toRow, toCol,
          side: 'black',
          pieceType: '',
          scoreBefore: stepScoreBefore,
          scoreAfter: stepScoreAfter,
        });
      }
    }, 200);
  }, [difficulty, analyzeFen, speechOn]);

  /** 筛选当前选中棋子的可行走法 */
  const moveTargets: MoveTargets | null = useMemo(() => {
    if (!selected || allLegalMoves.length === 0) return null;
    const pieceMoves = allLegalMoves.filter(m => m.from_row === selected.row && m.from_col === selected.col);
    const captures: Move[] = [];
    const moves: Move[] = [];
    for (const m of pieceMoves) {
      if (board?.rows[m.to_row]?.[m.to_col]) {
        captures.push(m);
      } else {
        moves.push(m);
      }
    }
    return { moves, captures };
  }, [selected, allLegalMoves, board]);

  /** 交叉点点击处理器 */
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!board || status !== 'ready') return;
    if (aiThinking) return; // AI 计算中不可操作

    // PVE 模式：只有轮到红方（人类）时可以操作
    if (gameMode === 'pve' && board.side_to_move !== 'red') return;

    const piece = board.rows[row]?.[col];

    // 情况 1：已有选中棋子，点击合法目标 → 走棋
    if (moveTargets) {
      const isTarget = moveTargets.moves.some(m => m.to_row === row && m.to_col === col) ||
                       moveTargets.captures.some(m => m.to_row === row && m.to_col === col);
      if (isTarget) {
        const piece = board.rows[selected!.row]?.[selected!.col];
        const notation = piece
          ? moveToNotation(selected!.row, selected!.col, row, col, piece.piece_type, piece.side as 'red' | 'black')
          : `${selected!.row},${selected!.col}→${row},${col}`;
        const sideLabel = piece?.side === 'red' ? '红方' : '黑方';

        const newFen = wasmMakeMove(fen, selected!.row, selected!.col, row, col);
        const stepScoreBefore = score;
        const stepScoreAfter = evaluate(newFen);

        // 播放音效
        const captured = board.rows[row]?.[col];
        if (captured) playCapture();
        else playMove();
        setLastMoveDesc(`${sideLabel}：${notation}`);
        if (speechOn) speakNotation(notation);

        analyzeFen(newFen);

        // 记录走棋步骤
        if (piece) {
          let game = currentGameRef.current;
          if (gameMode === 'pve' && !game) {
            game = createGame('pve', difficulty);
            currentGameRef.current = game;
            setCurrentGame(game);
          }
          if (game) {
            addStep(game, {
              fen,
              fromRow: selected!.row, fromCol: selected!.col,
              toRow: row, toCol: col,
              side: piece.side as 'red' | 'black',
              pieceType: piece.piece_type,
              scoreBefore: stepScoreBefore,
              scoreAfter: stepScoreAfter,
            });
          }
        }
        return;
      }
    }

    // 情况 2：点击己方棋子 → 选中
    if (piece && piece.side === board.side_to_move) {
      setSelected({ row, col });
      return;
    }

    // 情况 2b：点击对方棋子 → 提示轮到谁走
    if (piece && piece.side !== board.side_to_move) {
      const msg = board.side_to_move === 'red' ? '该红方走棋' : '该黑方走棋';
      setWrongSideMsg(msg);
      clearTimeout(wrongSideTimer.current);
      wrongSideTimer.current = setTimeout(() => setWrongSideMsg(null), 1500);
      return;
    }

    // 情况 3 → 取消选中
    setSelected(null);
  }, [board, status, moveTargets, fen, selected, analyzeFen, aiThinking, gameMode, difficulty, score, speechOn]);

  // 每当 PVE 模式下局面更新且轮到黑方时，触发 AI
  useEffect(() => {
    if (gameMode === 'pve' && board && board.side_to_move === 'black' && !board.checkmate && !board.stalemate && !aiThinking) {
      triggerAI();
    }
  }, [board, gameMode, triggerAI, aiThinking]);

  const isGameOver = board?.checkmate || board?.stalemate;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-4">
        {/* ─── 标题 ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              灵弈
              <span className="ml-3 text-sm font-normal text-zinc-500">LingYi</span>
            </h1>
            <p className="text-xs text-zinc-600">WASM 象棋引擎</p>
          </div>

          {/* 引擎状态指示 */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              status === 'ready' ? 'bg-green-500'
              : status === 'loading' ? 'bg-yellow-500'
              : 'bg-red-500'
            }`} />
            <span className="text-zinc-400">
              {status === 'loading' ? '加载 WASM...'
              : status === 'ready' ? '就绪'
              : `错误`}
            </span>
          </div>
        </div>

        {/* ─── 模式选择 + 音效 ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-900/80 rounded-lg border border-zinc-700/50 text-xs shadow-sm">
              <button onClick={() => setGameMode('pvp')}
                className={`px-3 py-1.5 rounded-l-lg transition-all duration-150 ${
                  gameMode === 'pvp'
                    ? 'bg-gradient-to-b from-amber-600/90 to-amber-700/90 text-white shadow-inner shadow-amber-400/20 border-r border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}>
                双人对弈
              </button>
              <button onClick={() => setGameMode('pve')}
                className={`px-3 py-1.5 rounded-r-lg transition-all duration-150 ${
                  gameMode === 'pve'
                    ? 'bg-gradient-to-b from-amber-600/90 to-amber-700/90 text-white shadow-inner shadow-amber-400/20 border-l border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}>
                人机对战
              </button>
            </div>

            {gameMode === 'pve' && (
              <div className="flex bg-zinc-900/80 rounded-lg border border-zinc-700/50 text-xs shadow-sm">
                {DIFFICULTIES.map((d, i) => (
                  <button key={d.label} onClick={() => setDifficulty(i)}
                    className={`px-2.5 py-1.5 transition-all duration-150 ${
                      i > 0 ? 'border-l border-zinc-700/50' : ''
                    } ${i === 0 ? 'rounded-l-lg' : ''} ${
                      i === DIFFICULTIES.length - 1 ? 'rounded-r-lg' : ''
                    } ${
                      difficulty === i
                        ? 'bg-gradient-to-b from-amber-600/90 to-amber-700/90 text-white shadow-inner shadow-amber-400/20'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1.5 text-xs">
            <button onClick={() => setSoundOn(v => !v)}
              className={`px-2 py-1 rounded transition-all duration-150 border ${
                soundOn
                  ? 'bg-amber-900/30 text-amber-300 border-amber-700/50 shadow-sm shadow-amber-900/20'
                  : 'bg-zinc-900/50 text-zinc-600 border-zinc-800/50'
              }`}>
              {soundOn ? '音效' : '音效'}
            </button>
            <button onClick={() => setSpeechOn(v => !v)}
              className={`px-2 py-1 rounded transition-all duration-150 border ${
                speechOn
                  ? 'bg-amber-900/30 text-amber-300 border-amber-700/50 shadow-sm shadow-amber-900/20'
                  : 'bg-zinc-900/50 text-zinc-600 border-zinc-800/50'
              }`}>
              {speechOn ? '报棋' : '报棋'}
            </button>
          </div>
        </div>

        {/* ─── 棋盘（自适应宽度） ─── */}
        {board && (
          <div ref={boardScaleRef} className="w-full overflow-hidden">
          <div style={{
            transform: `scale(${boardScale})`,
            transformOrigin: 'top center',
            width: BASE_SVG_W,
            margin: '0 auto',
          }}>
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-3">
              <div className="flex flex-col items-center gap-2">
                {/* 状态栏 */}
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className={board.side_to_move === 'red' ? 'text-red-400 font-medium' : ''}>
                    {board.side_to_move === 'red' ? '红方走棋' : '黑方走棋'}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span>{moveCount} 个走法</span>
                  <span className="text-zinc-600">|</span>
                  <span className={score > 0 ? 'text-red-400' : score < 0 ? 'text-zinc-300' : ''}>
                    评估 {score.toFixed(1)}
                  </span>
                </div>

                {/* 上一步走法（中文棋谱） */}
                {lastMoveDesc && (
                  <div className="text-sm font-medium text-zinc-200 bg-zinc-800/60 px-4 py-1 rounded-full">
                    {lastMoveDesc}
                  </div>
                )}

                {/* 提示信息 */}
                <div className="flex items-center gap-2 text-xs h-4">
                  {isGameOver ? (
                    <span className="text-yellow-400 font-medium">
                      {board.checkmate ? '将杀！游戏结束' : '困毙！和棋'}
                    </span>
                  ) : aiThinking ? (
                    <span className="text-blue-400 animate-pulse">AI 思考中...</span>
                  ) : gameMode === 'pve' && board.side_to_move === 'black' ? (
                    <span className="text-zinc-500">等待 AI 回应...</span>
                  ) : gameMode === 'pve' && board.side_to_move === 'red' ? (
                    <span className="text-green-400">轮到你走棋</span>
                  ) : !lastMoveDesc ? (
                    <span className="text-zinc-600">点击棋子选中</span>
                  ) : null}
                </div>

                {/* 违规提示，1.5 秒自动消失 */}
                {wrongSideMsg && (
                  <div className="text-xs text-yellow-400 font-medium">{wrongSideMsg}</div>
                )}

                {/* 棋盘 SVG + 棋子层 */}
                <div className="relative" style={{ width: BASE_SVG_W, height: BASE_SVG_H }}>
                  <GridSVG cell={BASE_CELL} margin={BASE_MARGIN} />

                  {/* 走法提示（绿点 + 红圈） */}
                  {moveTargets?.moves.map(m => (
                    <MoveDot key={`dot-${m.to_row}-${m.to_col}`} row={m.to_row} col={m.to_col} cell={BASE_CELL} margin={BASE_MARGIN} />
                  ))}
                  {moveTargets?.captures.map(m => (
                    <CaptureRing key={`cap-${m.to_row}-${m.to_col}`} row={m.to_row} col={m.to_col} cell={BASE_CELL} margin={BASE_MARGIN} />
                  ))}

                  {/* 可点击交叉点 */}
                  {board.rows.map((row, ri) =>
                    row.map((cell, ci) => {
                      const isSelectable = cell?.side === board.side_to_move && !aiThinking;
                      const isTarget = moveTargets?.moves.some(m => m.to_row === ri && m.to_col === ci) ||
                                      moveTargets?.captures.some(m => m.to_row === ri && m.to_col === ci);
                      return (
                        <div
                          key={`cell-${ri}-${ci}`}
                          className="absolute z-10 flex items-center justify-center"
                          style={{
                            left: ix(ci, BASE_CELL, BASE_MARGIN), top: iy(ri, BASE_CELL, BASE_MARGIN),
                            width: BASE_CELL + 6, height: BASE_CELL + 6,
                            transform: 'translate(-50%, -50%)',
                            cursor: isSelectable || isTarget ? 'pointer' : 'default',
                          }}
                          onClick={() => handleCellClick(ri, ci)}
                        >
                          {cell && (
                            <PieceToken
                              piece_type={cell.piece_type}
                              side={cell.side}
                              selected={selected?.row === ri && selected?.col === ci}
                              cell={BASE_CELL}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
          </div>
        )}

        {/* ─── 预设局面 ─── */}
        <div className="flex gap-2 flex-wrap">
          {SCENES.map((s) => (
            <button key={s.label} onClick={() => analyzeFen(s.fen)}
              className="px-3 py-1.5 text-sm rounded-md bg-zinc-800/60 border border-zinc-700/40
                text-zinc-300 hover:bg-zinc-700/80 hover:border-amber-700/50 hover:text-amber-200
                transition-all duration-150 shadow-sm active:scale-[0.97]">
              {s.label}
            </button>
          ))}
        </div>

        {gameMode === 'pve' && aiStats.gamesPlayed > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">AI 对战统计</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-4 gap-1 text-xs text-center">
                <div><dt className="text-zinc-500">总局</dt><dd className="text-white font-medium">{aiStats.gamesPlayed}</dd></div>
                <div><dt className="text-zinc-500">胜</dt><dd className="text-green-400 font-medium">{aiStats.wins}</dd></div>
                <div><dt className="text-zinc-500">负</dt><dd className="text-red-400 font-medium">{aiStats.losses}</dd></div>
                <div><dt className="text-zinc-500">和</dt><dd className="text-zinc-300 font-medium">{aiStats.draws}</dd></div>
              </dl>
              {weaknesses.length > 0 && (
                <ul className="mt-2 text-xs text-zinc-400 space-y-0.5 list-disc list-inside">
                  {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">FEN 棋谱</label>
          <Textarea
            value={fen}
            onChange={(e) => analyzeFen(e.target.value)}
            className="font-mono text-xs bg-zinc-900 border-zinc-800 min-h-[60px]"
            placeholder="输入 FEN 棋谱..."
          />
        </div>
      </div>
    </div>
  );
}
