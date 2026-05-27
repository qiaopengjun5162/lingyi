'use client';

import { useMemo } from 'react';
import { BASE_SVG_W, BASE_SVG_H, ix, iy } from '@/lib/board-constants';

const WARM_LINE = 'rgba(180,130,80,0.35)';
const WARM_TEXT = 'rgba(180,130,80,0.25)';

export function GridSVG({ cell, margin }: { cell: number; margin: number }) {
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
      {/* Board base */}
      <rect width={BASE_SVG_W} height={BASE_SVG_H} rx={2}
        fill="rgba(42,30,25,0.65)" stroke={WARM_LINE} strokeWidth={0.6} />

      {/* Outer border */}
      <rect x={M - 2} y={M - 2} width={8 * C + 4} height={9 * C + 4}
        fill="none" stroke={WARM_LINE} strokeWidth={0.8} rx={1} opacity={0.6} />

      {/* Grid lines */}
      {hLines.map(l => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={WARM_LINE} strokeWidth={0.5} />
      ))}
      {vLines.map(l => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={WARM_LINE} strokeWidth={0.5} />
      ))}

      {/* Corner diagonals */}
      {[[3,0,5,2],[5,0,3,2],[3,7,5,9],[5,7,3,9]].map(([x1,y1,x2,y2],i) => (
        <line key={`dg${i}`} x1={ix(x1,C,M)} y1={iy(y1,C,M)} x2={ix(x2,C,M)} y2={iy(y2,C,M)}
          stroke={WARM_LINE} strokeWidth={0.5} />
      ))}

      {/* 楚河汉界 — 行书水印 */}
      <text x={ix(2,C,M)} y={iy(4.5,C,M)} fill={WARM_TEXT} fontSize={16}
        fontFamily="'KaiTi', 'STKaiti', 'Noto Serif SC', serif"
        textAnchor="middle" dominantBaseline="central" letterSpacing={10} opacity={0.6}>
        楚 河
      </text>
      <text x={ix(6,C,M)} y={iy(4.5,C,M)} fill={WARM_TEXT} fontSize={16}
        fontFamily="'KaiTi', 'STKaiti', 'Noto Serif SC', serif"
        textAnchor="middle" dominantBaseline="central" letterSpacing={10} opacity={0.6}>
        汉 界
      </text>

      {/* 四角边框 — 传统画框折线 */}
      <g stroke={WARM_LINE} strokeWidth={1} fill="none" opacity={0.5}>
        <polyline points={`${M-4},${M+8} ${M-4},${M} ${M+8},${M}`} />
        <polyline points={`${M+8*C+4},${M} ${M+8*C+4},${M} ${M+8*C+4},${M+8}`} />
        <polyline points={`${M-4},${M+9*C-8} ${M-4},${M+9*C} ${M+8},${M+9*C}`} />
        <polyline points={`${M+8*C+4},${M+9*C} ${M+8*C+4},${M+9*C} ${M+8*C+4},${M+9*C-8}`} />
      </g>
    </svg>
  );
}
