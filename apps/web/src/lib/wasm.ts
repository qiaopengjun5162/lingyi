'use client';

/**
 * WASM 引擎加载器
 *
 * 使用 Function 构造器加载 wasm-pack 输出的 JS，绕过 Turbopack 对 import() 的拦截。
 * 浏览器扩展（Playwright MCP Bridge 等）对此不产生影响。
 */
import type { BoardState, Move, BestMoveResult } from './types';

type WasmFuncs = {
  fen_to_json: (fen: string) => string;
  get_legal_moves: (fen: string) => string;
  make_move: (fen: string, fr: number, fc: number, tr: number, tc: number) => string;
  is_check: (fen: string) => boolean;
  is_checkmate: (fen: string) => boolean;
  is_stalemate: (fen: string) => boolean;
  evaluate: (fen: string) => number;
  best_move: (fen: string, depth: number) => string;
};

let wasm: WasmFuncs | null = null;

async function loadWasmModule(): Promise<void> {
  const resp = await fetch('/wasm/lingyi_core.js');
  let code = await resp.text();

  // Transform ES module to global script: remove export keywords
  code = code.replace(/^export function /gm, 'function ');
  code = code.replace(/^export \{.*?\};/gm, '');

  // Expose functions on global namespace for access after Function() returns
  code += '\nself.__lingyiWasmApi = { evaluate, fen_to_json, get_legal_moves, is_check, is_checkmate, is_stalemate, make_move, best_move, __wbg_init };';

  new Function(code)();
}

export async function initWasm(): Promise<void> {
  if (wasm) return;

  await loadWasmModule();

  const lw = (self as unknown as Record<string, unknown>).__lingyiWasmApi as Record<string, unknown>;
  const init = lw.__wbg_init as (path?: string) => Promise<void>;
  await init('/wasm/lingyi_core_bg.wasm');

  wasm = {
    fen_to_json: lw.fen_to_json as (fen: string) => string,
    get_legal_moves: lw.get_legal_moves as (fen: string) => string,
    make_move: lw.make_move as (fen: string, fr: number, fc: number, tr: number, tc: number) => string,
    is_check: lw.is_check as (fen: string) => boolean,
    is_checkmate: lw.is_checkmate as (fen: string) => boolean,
    is_stalemate: lw.is_stalemate as (fen: string) => boolean,
    evaluate: lw.evaluate as (fen: string) => number,
    best_move: lw.best_move as (fen: string, depth: number) => string,
  };
}

function engine(): WasmFuncs {
  if (!wasm) throw new Error('WASM 未初始化，请先调用 initWasm()');
  return wasm;
}

export function fenToJson(fen: string): BoardState {
  return JSON.parse(engine().fen_to_json(fen));
}

export function getLegalMoves(fen: string): Move[] {
  return JSON.parse(engine().get_legal_moves(fen));
}

export function makeMove(fen: string, fr: number, fc: number, tr: number, tc: number): string {
  return engine().make_move(fen, fr, fc, tr, tc);
}

export function isCheck(fen: string): boolean {
  return engine().is_check(fen);
}

export function isCheckmate(fen: string): boolean {
  return engine().is_checkmate(fen);
}

export function isStalemate(fen: string): boolean {
  return engine().is_stalemate(fen);
}

export function evaluate(fen: string): number {
  return engine().evaluate(fen);
}

/** AI 搜索最佳走法，返回目标坐标或 null */
export function bestMove(fen: string, depth: number): BestMoveResult | null {
  const raw = engine().best_move(fen, depth);
  if (!raw || raw === '{}') return null;
  return JSON.parse(raw) as BestMoveResult;
}
