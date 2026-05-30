'use client';

const PIECE_CHAR: Record<string, Record<string, string>> = {
  King:    { red: '帅', black: '将' },
  Advisor: { red: '仕', black: '士' },
  Bishop:  { red: '相', black: '象' },
  Rook:    { red: '車', black: '車' },
  Knight:  { red: '馬', black: '馬' },
  Cannon:  { red: '炮', black: '炮' },
  Pawn:    { red: '兵', black: '卒' },
};

export function PieceToken({
  piece_type, side, selected, isLastMoved, cell,
}: {
  piece_type: string; side: string; selected?: boolean; isLastMoved?: boolean; cell: number;
}) {
  const size = cell * 0.86;
  const isRed = side === 'red';
  const char = PIECE_CHAR[piece_type]?.[side] ?? '?';

  const ringColor = selected
    ? (isRed ? '#c23b22' : '#1a0a00')
    : '#4a2808';

  const shadow = selected
    ? `0 0 0 3px ${ringColor}, 0 0 0 5px #d4b070, 0 5px 14px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.2)`
    : isLastMoved
    ? `0 0 0 3.5px #ffd060, 0 0 20px rgba(255,200,50,0.65), 0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.75), inset 0 -2px 3px rgba(0,0,0,0.18)`
    : `0 0 0 3px rgba(200,160,70,0.7), 0 4px 10px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.75), inset 0 -2px 3px rgba(0,0,0,0.18)`;

  return (
    <div
      className="relative transition-all duration-150 ease-out hover:scale-105"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 28%, #fdf6e4 0%, #f0e0b8 45%, #dcc888 80%, #c8b070 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: shadow,
        cursor: 'pointer',
        userSelect: 'none',
      }}>
      <span style={{
        fontFamily: "'Noto Serif SC','KaiTi','STKaiti',serif",
        fontSize: size * 0.52,
        fontWeight: 900,
        lineHeight: 1,
        color: isRed ? '#c23b22' : '#1a0a00',
        textShadow: isRed
          ? '0 1px 0 rgba(255,200,180,0.4)'
          : '0 1px 0 rgba(255,220,150,0.3)',
      }}>
        {char}
      </span>
    </div>
  );
}
