'use client';

import { useMemo } from 'react';
import { BASE_SVG_W, BASE_SVG_H, ix, iy } from '@/lib/board-constants';

const LINE = '#7a4e14';
const TEXT_COLOR = '#6a4010';

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
      <defs>
        {/* 棋盘面 — 枫木色，和天天象棋一致 */}
        <linearGradient id="boardWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbb86a" />
          <stop offset="50%" stopColor="#d4a84a" />
          <stop offset="100%" stopColor="#c89838" />
        </linearGradient>
        <filter id="boardShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>

      {/* 棋盘底色 */}
      <rect width={BASE_SVG_W} height={BASE_SVG_H} rx={6}
        fill="url(#boardWood)" stroke="#5a3010" strokeWidth={2} filter="url(#boardShadow)" />

      {/* 棋盘内边框 */}
      <rect x={M - 4} y={M - 4} width={8 * C + 8} height={9 * C + 8}
        fill="none" stroke={LINE} strokeWidth={1.5} rx={2} />

      {/* 横线 */}
      {hLines.map(l => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={LINE} strokeWidth={0.9} />
      ))}
      {/* 竖线 */}
      {vLines.map(l => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={LINE} strokeWidth={0.9} />
      ))}

      {/* 九宫斜线 */}
      {[[3,0,5,2],[5,0,3,2],[3,7,5,9],[5,7,3,9]].map(([x1,y1,x2,y2],i) => (
        <line key={`dg${i}`} x1={ix(x1,C,M)} y1={iy(y1,C,M)} x2={ix(x2,C,M)} y2={iy(y2,C,M)}
          stroke={LINE} strokeWidth={0.9} />
      ))}

      {/* 楚河汉界 — 和天天象棋一样大小清晰 */}
      <text x={ix(2,C,M)} y={iy(4.5,C,M)} fill={TEXT_COLOR} fontSize={18}
        fontFamily="'KaiTi','STKaiti','Noto Serif SC',serif" fontWeight="bold"
        textAnchor="middle" dominantBaseline="central" letterSpacing={12}>
        楚 河
      </text>
      <text x={ix(6,C,M)} y={iy(4.5,C,M)} fill={TEXT_COLOR} fontSize={18}
        fontFamily="'KaiTi','STKaiti','Noto Serif SC',serif" fontWeight="bold"
        textAnchor="middle" dominantBaseline="central" letterSpacing={12}>
        汉 界
      </text>

      {/* 四角装饰折线 */}
      <g stroke={LINE} strokeWidth={2} fill="none">
        <polyline points={`${M-6},${M+10} ${M-6},${M-6} ${M+10},${M-6}`} />
        <polyline points={`${M+8*C-10},${M-6} ${M+8*C+6},${M-6} ${M+8*C+6},${M+10}`} />
        <polyline points={`${M-6},${M+9*C-10} ${M-6},${M+9*C+6} ${M+10},${M+9*C+6}`} />
        <polyline points={`${M+8*C-10},${M+9*C+6} ${M+8*C+6},${M+9*C+6} ${M+8*C+6},${M+9*C-10}`} />
      </g>
    </svg>
  );
}
