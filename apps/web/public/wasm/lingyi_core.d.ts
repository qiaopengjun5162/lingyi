/* tslint:disable */
/* eslint-disable */

/**
 * AI 走棋：搜索最佳走法，返回 JSON。
 * depth: 搜索深度（2=入门, 4=中级, 6=高级）。
 * 返回 JSON: { from_row, from_col, to_row, to_col, score }
 * 无合法走法时返回空对象 {}。
 */
export function best_move(fen: string, depth: number): string;

/**
 * 简易子力评估（正数 = 红方优势）。
 */
export function evaluate(fen: string): number;

/**
 * 解析 FEN 字符串，返回棋盘完整 JSON。
 */
export function fen_to_json(fen: string): string;

/**
 * 获取当前局面的所有合法走法，返回 JSON 数组字符串。
 */
export function get_legal_moves(fen: string): string;

/**
 * 判断走棋方是否被将军。
 */
export function is_check(fen: string): boolean;

/**
 * 判断是否被将杀。
 */
export function is_checkmate(fen: string): boolean;

/**
 * 判断是否被困毙。
 */
export function is_stalemate(fen: string): boolean;

/**
 * 执行一步走法，返回新局面的 FEN 字符串。
 * 如果走法非法，返回原 FEN。
 */
export function make_move(fen: string, from_row: number, from_col: number, to_row: number, to_col: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly best_move: (a: number, b: number, c: number) => [number, number];
    readonly evaluate: (a: number, b: number) => number;
    readonly fen_to_json: (a: number, b: number) => [number, number];
    readonly get_legal_moves: (a: number, b: number) => [number, number];
    readonly is_check: (a: number, b: number) => number;
    readonly is_checkmate: (a: number, b: number) => number;
    readonly is_stalemate: (a: number, b: number) => number;
    readonly make_move: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
