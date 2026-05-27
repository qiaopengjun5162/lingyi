export const BASE_CELL = 48;
export const BASE_MARGIN = 20;
export const BOARD_W = BASE_CELL * 8;
export const BOARD_H = BASE_CELL * 9;
export const BASE_SVG_W = BOARD_W + BASE_MARGIN * 2;
export const BASE_SVG_H = BOARD_H + BASE_MARGIN * 2;

export const ROSE_WOOD = '#5c2e16';
export const GOLD_LINE = '#c9a84c';
export const GOLD_GLOW = 'rgba(201,168,76,0.3)';

export const PIECE_CHAR: Record<string, Record<string, string>> = {
  King:    { red: '帅', black: '将' },
  Advisor: { red: '仕', black: '士' },
  Bishop:  { red: '相', black: '象' },
  Rook:    { red: '車', black: '車' },
  Knight:  { red: '馬', black: '馬' },
  Cannon:  { red: '炮', black: '炮' },
  Pawn:    { red: '兵', black: '卒' },
};

export const ix = (col: number, cell: number, margin: number) => margin + col * cell;
export const iy = (row: number, cell: number, margin: number) => margin + row * cell;

export const SCENES = [
  { label: '开局', fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w' },
  { label: '劣势', fen: '2bak4/4a4/4b4/9/9/9/9/4C4/3R1K3/9 w' },
  { label: '优势', fen: '4kab2/4a4/4b4/9/9/2R6/9/3R5/4K4/9 w' },
  { label: '跳马布局', fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/2N6/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w' },
];

export const DIFFICULTIES = [
  { label: '入门', depth: 2 },
  { label: '中级', depth: 4 },
  { label: '高级', depth: 6 },
];

export const WOOD_GRAINS: [number, number, number][] = [
  [15,0.8,0.3],[28,0.5,0.25],[50,1.0,0.2],[80,0.6,0.2],[110,0.4,0.3],
  [150,0.7,0.15],[180,0.9,0.2],[210,0.5,0.25],[240,0.6,0.2],[270,0.8,0.15],
  [310,0.5,0.25],[340,0.7,0.2],[370,0.4,0.3],
];

export const WOOD_GRAINS_FINE: [number, number, number][] = [
  [22,0.4,0.15],[42,0.3,0.12],[65,0.5,0.1],[95,0.3,0.15],[130,0.4,0.1],
  [165,0.5,0.12],[195,0.3,0.1],[225,0.4,0.15],[255,0.3,0.1],[290,0.5,0.12],
  [325,0.4,0.1],[355,0.3,0.15],
];
