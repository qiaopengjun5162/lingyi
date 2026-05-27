'use client';

const PIECE_CHAR: Record<string, Record<string, string>> = {
  King: { red: '帅', black: '将' },
  Advisor: { red: '仕', black: '士' },
  Bishop: { red: '相', black: '象' },
  Rook: { red: '車', black: '車' },
  Knight: { red: '馬', black: '馬' },
  Cannon: { red: '炮', black: '炮' },
  Pawn: { red: '兵', black: '卒' },
};

export function PieceToken({
  piece_type, side, selected, cell,
}: {
  piece_type: string; side: string; selected?: boolean; cell: number;
}) {
  const size = cell * 0.85;
  const isRed = side === 'red';
  const char = PIECE_CHAR[piece_type]?.[side] ?? '?';

  const textColor = isRed ? '#c23b22' : '#1a0f00';
  const bg = 'radial-gradient(circle at 35% 28%, #faf3e0 0%, #eddcb0 40%, #d8c08a 75%, #c4a870 100%)';
  const ringColor = selected
    ? (isRed ? 'rgba(194,59,34,0.75)' : 'rgba(26,26,26,0.65)')
    : 'rgba(70,38,10,0.72)';
  const shadow = [
    `0 0 0 2.5px ${ringColor}`,
    '0 0 0 4.5px rgba(210,175,110,0.38)',
    '0 4px 10px rgba(0,0,0,0.48)',
    'inset 0 1.5px 4px rgba(255,255,255,0.7)',
    'inset 0 -2px 3px rgba(0,0,0,0.18)',
  ].join(',');

  return (
    <div
      className="relative transition-all duration-150 ease-out hover:scale-105"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: bg,
        border: '1.5px solid rgba(70,38,10,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: shadow,
        cursor: 'pointer',
        userSelect: 'none',
      }}>
      <span style={{
        fontFamily: "'Noto Serif SC', 'KaiTi', 'STKaiti', serif",
        fontSize: size * 0.54,
        fontWeight: 900,
        lineHeight: 1,
        color: textColor,
        textShadow: isRed ? '0 1px 2px rgba(120,20,10,0.25)' : '0 1px 2px rgba(0,0,0,0.28)',
      }}>
        {char}
      </span>
    </div>
  );
}
