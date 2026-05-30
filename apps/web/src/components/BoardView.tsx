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
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'rgba(200,160,50,0.55)' }} />
    </div>
  );
}

function CaptureRing({ row, col }: { row: number; col: number }) {
  const size = BASE_CELL * 0.82;
  return (
    <div className="absolute z-20 pointer-events-none flex items-center justify-center"
      style={{ left: ix(col, BASE_CELL, BASE_MARGIN), top: iy(row, BASE_CELL, BASE_MARGIN), width: BASE_CELL, height: BASE_CELL, transform: 'translate(-50%,-50%)' }}>
      <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid rgba(200,160,50,0.5)', backgroundColor: 'rgba(200,160,50,0.06)' }} />
    </div>
  );
}

interface BoardViewProps {
  board: BoardState;
  selected: { row: number; col: number } | null;
  moveTargets: MoveTargets | null;
  lastMove: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null;
  boardScale: number;
  boardScaleRef: React.RefObject<HTMLDivElement | null>;
  aiThinking: boolean;
  lastMoveDesc: string | null;
  moveCount: number;
  score: number;
  isGameOver: boolean;
  mood: { type: 'blunder' | 'brilliant'; diff: number } | null;
  timerEnabled: boolean;
  redTime: number;
  blackTime: number;
  timedOut: 'red' | 'black' | null;
  repetitionDraw: boolean;
  onMoodDismiss: () => void;
  onCellClick: (row: number, col: number) => void;
  onRestart: () => void;
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function BoardView({
  board, selected, moveTargets, lastMove, boardScale, boardScaleRef,
  aiThinking, lastMoveDesc,
  moveCount, score, isGameOver, mood, onMoodDismiss, onCellClick, onRestart,
  timerEnabled, redTime, blackTime, timedOut, repetitionDraw,
}: BoardViewProps) {
  const resultText = timedOut === 'red' ? '黑方胜' : timedOut === 'black' ? '红方胜' :
    repetitionDraw ? '和棋' : board.checkmate ? (board.side_to_move === 'red' ? '黑方胜' : '红方胜') : '和棋';
  const subText = timedOut ? (timedOut === 'red' ? '红方超时' : '黑方超时') :
    repetitionDraw ? '三次重复' : board.checkmate ? '将　杀' : '困　毙';
  const resultColor = timedOut === 'red' ? '#c8b070' : timedOut === 'black' ? '#c23b22' :
    repetitionDraw ? '#c9a84c' : board.checkmate ? (board.side_to_move === 'red' ? '#c8b070' : '#c23b22') : '#c9a84c';
  return (
    <div ref={boardScaleRef} className="w-full overflow-hidden">
      <div style={{
        transform: `scale(${boardScale})`,
        transformOrigin: 'top center',
        width: BASE_SVG_W,
        margin: '0 auto',
      }}>
        <Card
          className="border-[#8a5520]/40"
          style={{
            background: 'linear-gradient(160deg, #7a5535 0%, #5c3e28 50%, #4a3020 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,210,130,0.1)',
          }}>
          <CardContent className="p-2.5">
            <div className="flex flex-col items-center gap-1.5">

              {/* Status line */}
              <div className="flex items-center gap-2 text-[13px] font-['KaiTi','STKaiti',serif] text-[#f0dfa8]/80 tracking-wider">
                <span className={board.side_to_move === 'red' ? 'text-[#c23b22]' : 'text-[#f0dfa8]/80'}>
                  {board.side_to_move === 'red' ? '▶' : '◆'} {moveCount}
                </span>
                <span className="text-[#f0dfa8]/40">|</span>
                <span className={score > 0 ? 'text-[#c23b22] font-bold' : score < 0 ? 'text-[#8ab0e0] font-bold' : 'text-[#f0dfa8]/75'}>
                  {score > 0 ? '+' : ''}{score.toFixed(1)}
                </span>
                {board.check && <span className="text-red-400 font-bold animate-pulse">将！</span>}
                {isGameOver && <span className="text-[#c9a84c] font-bold">{board.checkmate ? '将杀' : '困毙'}</span>}
              </div>

              {lastMoveDesc && (
                <div className="text-[13px] font-['KaiTi','STKaiti',serif] text-[#f0dfa8]/85 px-3 py-1 bg-black/25 rounded border border-[#c9a84c]/20">
                  {lastMoveDesc}
                </div>
              )}

              {mood && <EmotionBubble key={`${mood.type}-${mood.diff}`} emotion={mood} onDismiss={onMoodDismiss} />}

              {timerEnabled && (
                <div className="flex items-center justify-between w-full px-1">
                  <span className="text-[11px] font-['KaiTi','STKaiti',serif] text-[#f0dfa8]/65">黑方</span>
                  <span className={`text-sm font-mono font-bold tabular-nums ${blackTime <= 30 ? 'text-red-400 animate-pulse' : 'text-[#f0dfa8]/82'}`}>
                    {fmtTime(blackTime)}
                  </span>
                </div>
              )}

              {/* Board */}
              <div className="relative" style={{ width: BASE_SVG_W, height: BASE_SVG_H }}>
                <GridSVG cell={BASE_CELL} margin={BASE_MARGIN} />

                {/* 上一手高亮 */}
                {lastMove && [
                  { r: lastMove.fromRow, c: lastMove.fromCol },
                  { r: lastMove.toRow,   c: lastMove.toCol   },
                ].map(({ r, c }, i) => (
                  <div key={`lm-${i}`} className="absolute pointer-events-none z-[5]"
                    style={{
                      left: ix(c, BASE_CELL, BASE_MARGIN) - BASE_CELL / 2,
                      top:  iy(r, BASE_CELL, BASE_MARGIN) - BASE_CELL / 2,
                      width: BASE_CELL, height: BASE_CELL,
                      background: i === 1
                        ? 'rgba(220,180,60,0.35)'
                        : 'rgba(220,180,60,0.18)',
                      borderRadius: 2,
                      boxShadow: i === 1 ? 'inset 0 0 0 2px rgba(220,180,60,0.6)' : undefined,
                    }} />
                ))}

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
                            isLastMoved={lastMove !== null && ri === lastMove.toRow && ci === lastMove.toCol}
                            cell={BASE_CELL}
                          />
                        )}
                      </div>
                    );
                  })
                )}
                {isGameOver && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded"
                    style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)' }}>
                    <div className="text-center space-y-3">
                      <div className="text-4xl font-['KaiTi','STKaiti',serif] font-bold tracking-widest"
                        style={{ color: resultColor }}>
                        {resultText}
                      </div>
                      <div className="text-sm font-['KaiTi','STKaiti',serif] text-[#f0dfa8]/65 tracking-widest">
                        {subText}
                      </div>
                      <button onClick={onRestart}
                        className="mt-2 px-5 py-1.5 text-sm font-['KaiTi','STKaiti',serif] tracking-wider
                          bg-[#8a5a20]/50 text-[#f0dfa8]/95 border border-[#c8a050]/70
                          hover:bg-[#8a5a20]/70 transition-all duration-150 rounded">
                        再来一局
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {timerEnabled && (
                <div className="flex items-center justify-between w-full px-1 mt-0.5">
                  <span className="text-[11px] font-['KaiTi','STKaiti',serif] text-[#f0dfa8]/65">红方</span>
                  <span className={`text-sm font-mono font-bold tabular-nums ${redTime <= 30 ? 'text-red-400 animate-pulse' : 'text-[#f0dfa8]/82'}`}>
                    {fmtTime(redTime)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
