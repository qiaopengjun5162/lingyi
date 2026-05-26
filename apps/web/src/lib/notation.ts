'use client';

const PIECE: Record<string, Record<string, string>> = {
  King:    { red: '帅', black: '将' },
  Advisor: { red: '仕', black: '士' },
  Bishop:  { red: '相', black: '象' },
  Rook:    { red: '车', black: '车' },
  Knight:  { red: '马', black: '马' },
  Cannon:  { red: '炮', black: '炮' },
  Pawn:    { red: '兵', black: '卒' },
};

const LINEAR_TYPES = new Set(['Rook', 'Cannon', 'Pawn', 'King']);

export function moveToNotation(
  fromRow: number, fromCol: number,
  toRow: number, toCol: number,
  pieceType: string, side: 'red' | 'black',
): string {
  const char = PIECE[pieceType]?.[side] ?? pieceType;

  const colNum = side === 'red' ? 9 - fromCol : fromCol + 1;

  if (fromRow === toRow) {
    const destCol = side === 'red' ? 9 - toCol : toCol + 1;
    return `${char}${colNum}平${destCol}`;
  }

  const rowDiff = toRow - fromRow;
  const isAdvancing = side === 'red' ? rowDiff < 0 : rowDiff > 0;
  const action = isAdvancing ? '进' : '退';

  if (LINEAR_TYPES.has(pieceType)) {
    return `${char}${colNum}${action}${Math.abs(rowDiff)}`;
  }

  const destCol = side === 'red' ? 9 - toCol : toCol + 1;
  return `${char}${colNum}${action}${destCol}`;
}
