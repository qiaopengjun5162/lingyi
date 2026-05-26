/**
 * WASM ↔ 前端数据契约
 * 与 crates/lingyi-core/src/wasm.rs 的输出结构一一对应。
 */

export type PieceType =
  | 'King' | 'Advisor' | 'Bishop'
  | 'Rook' | 'Knight' | 'Cannon' | 'Pawn';

export type Side = 'red' | 'black';

export interface Cell {
  piece_type: PieceType;
  side: Side;
}

export interface BoardState {
  fen: string;
  rows: (Cell | null)[][];
  side_to_move: Side;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

export interface Move {
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
  piece_type: PieceType;
  side: Side;
}

export const PIECE_SYMBOLS: Record<PieceType, [string, string]> = {
  King:    ['帅', '将'],
  Advisor: ['仕', '士'],
  Bishop:  ['相', '象'],
  Rook:    ['車', '車'],
  Knight:  ['馬', '馬'],
  Cannon:  ['炮', '炮'],
  Pawn:    ['兵', '卒'],
};

export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';

/** AI 走棋结果 */
export interface BestMoveResult {
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
}

/** 游戏模式 */
export type GameMode = 'pvp' | 'pve';

/** 对局记录中的一步 */
export interface MoveRecord {
  fen: string;
  move: Move;
  scoreBefore: number;
  scoreAfter: number;
}

/** AI 统计 */
export interface AIStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}
