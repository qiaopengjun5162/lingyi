'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GridSVG } from '@/components/GridSVG';
import { PieceToken } from '@/components/PieceToken';
import { BASE_CELL, BASE_MARGIN, BASE_SVG_W, BASE_SVG_H, ix, iy } from '@/lib/board-constants';
import type { BoardState } from '@/lib/types';
import type { MoveTargets } from '@/hooks/useGame';
import { EmotionBubble } from '@/components/EmotionBubble';

function MoveDot({ row, col }: { row: number; col: number }) {
  return (
    <div className="absolute z-20 pointer-events-none flex items-center justify-center"
      style={{ left: ix(col, BASE_CELL, BASE_MARGIN), top: iy(row, BASE_CELL, BASE_MARGIN), width: BASE_CELL, height: BASE_CELL, transform: 'translate(-50%,-50%)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'rgba(194,59,34,0.3)' }} />
    </div>
  );
}

function CaptureRing({ row, col }: { row: number; col: number }) {
  const size = BASE_CELL * 0.82;
  return (
    <div className="absolute z-20 pointer-events-none flex items-center justify-center"
      style={{ left: ix(col, BASE_CELL, BASE_MARGIN), top: iy(row, BASE_CELL, BASE_MARGIN), width: BASE_CELL, height: BASE_CELL, transform: 'translate(-50%,-50%)' }}>
      <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid rgba(194,59,34,0.35)', backgroundColor: 'rgba(194,59,34,0.04)' }} />
    </div>
  );
}

interface BoardViewProps {
  board: BoardState;
  selected: { row: number; col: number } | null;
  moveTargets: MoveTargets | null;
  boardScale: number;
  boardScaleRef: React.RefObject<HTMLDivElement | null>;
  aiThinking: boolean;
  lastMoveDesc: string | null;
  moveCount: number;
  score: number;
  isGameOver: boolean;
  mood: { type: 'blunder' | 'brilliant'; diff: number } | null;
  onMoodDismiss: () => void;
  onCellClick: (row: number, col: number) => void;
}

export function BoardView({
  board, selected, moveTargets, boardScale, boardScaleRef,
  aiThinking, lastMoveDesc,
  moveCount, score, isGameOver, mood, onMoodDismiss, onCellClick,
}: BoardViewProps) {
  return (
    <div ref={boardScaleRef} className="w-full overflow-hidden">
      <div style={{
        transform: `scale(${boardScale})`,
        transformOrigin: 'top center',
        width: BASE_SVG_W,
        margin: '0 auto',
      }}>
        <Card
          className="border-[#c9a84c]/8"
          style={{
            background: 'linear-gradient(180deg, rgba(42,30,25,0.55), rgba(32,22,18,0.6))',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
          <CardContent className="p-2.5">
            <div className="flex flex-col items-center gap-1.5">

              {/* Status line */}
              <div className="flex items-center gap-2 text-[10px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/50 tracking-wider">
                <span className={board.side_to_move === 'red' ? 'text-[#c23b22]/60' : ''}>
                  {board.side_to_move === 'red' ? '▶' : '◆'} {moveCount}
                </span>
                <span className="text-[#c9a84c]/25">|</span>
                <span className={score > 0 ? 'text-[#c23b22]/50' : score < 0 ? 'text-white/35' : ''}>
                  {score > 0 ? '+' : ''}{score.toFixed(1)}
                </span>
                {board.check && <span className="text-red-400/60">将</span>}
                {isGameOver && <span className="text-[#c9a84c]/50">{board.checkmate ? '将杀' : '困毙'}</span>}
              </div>

              {lastMoveDesc && (
                <div className="text-[10px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/45 px-2.5 py-0.5 bg-black/20 rounded-sm">
                  {lastMoveDesc}
                </div>
              )}

              {mood && <EmotionBubble key={`${mood.type}-${mood.diff}`} emotion={mood} onDismiss={onMoodDismiss} />}

              {/* Board */}
              <div className="relative" style={{ width: BASE_SVG_W, height: BASE_SVG_H }}>
                <GridSVG cell={BASE_CELL} margin={BASE_MARGIN} />

                {moveTargets?.moves.map(m => (
                  <MoveDot key={`dot-${m.to_row}-${m.to_col}`} row={m.to_row} col={m.to_col} />
                ))}
                {moveTargets?.captures.map(m => (
                  <CaptureRing key={`cap-${m.to_row}-${m.to_col}`} row={m.to_row} col={m.to_col} />
                ))}

                {board.rows.map((row, ri) =>
                  row.map((cell, ci) => {
                    const isSelectable = cell?.side === board.side_to_move && !aiThinking;
                    const isTarget = moveTargets?.moves.some(m => m.to_row === ri && m.to_col === ci)
                      || moveTargets?.captures.some(m => m.to_row === ri && m.to_col === ci);
                    return (
                      <div key={`cell-${ri}-${ci}`}
                        className="absolute z-10 flex items-center justify-center"
                        style={{
                          left: ix(ci, BASE_CELL, BASE_MARGIN), top: iy(ri, BASE_CELL, BASE_MARGIN),
                          width: BASE_CELL + 6, height: BASE_CELL + 6,
                          transform: 'translate(-50%, -50%)',
                          cursor: isSelectable || isTarget ? 'pointer' : 'default',
                        }}
                        onClick={() => onCellClick(ri, ci)}>
                        {cell && (
                          <PieceToken
                            piece_type={cell.piece_type}
                            side={cell.side}
                            selected={selected?.row === ri && selected?.col === ci}
                            cell={BASE_CELL}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
