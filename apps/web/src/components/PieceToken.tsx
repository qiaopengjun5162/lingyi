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

  // Warm jade/ivory body — no neon, no glow
  const bg = 'radial-gradient(circle at 38% 32%, rgba(248,240,220,0.96), rgba(225,208,180,0.92) 50%, rgba(200,185,160,0.88) 100%)';
  const textColor = isRed ? '#c23b22' : '#1a1a1a';
  const borderColor = selected
    ? (isRed ? 'rgba(194,59,34,0.55)' : 'rgba(26,26,26,0.45)')
    : 'rgba(180,150,110,0.35)';
  const outerShadow = selected
    ? '0 0 0 2px rgba(194,59,34,0.12), 0 2px 8px rgba(0,0,0,0.25)'
    : '0 1px 3px rgba(0,0,0,0.18), 0 0 0 1px rgba(180,150,110,0.15)';
  const selectedRing = selected ? '2px solid rgba(194,59,34,0.25)' : 'none';

  return (
    <div
      className="relative transition-all duration-200 ease-out hover:scale-105"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: bg,
        border: `1.5px solid ${borderColor}`,
        outline: selectedRing,
        outlineOffset: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: outerShadow,
        cursor: 'pointer',
        userSelect: 'none',
      }}>
      <span style={{
        fontFamily: "'Noto Serif SC', 'KaiTi', serif",
        fontSize: size * 0.52,
        fontWeight: 800,
        lineHeight: 1,
        color: textColor,
        textShadow: '0 1px 1px rgba(0,0,0,0.12)',
      }}>
        {char}
      </span>
    </div>
  );
}
