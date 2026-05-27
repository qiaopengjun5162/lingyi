'use client';

import { BoardView } from '@/components/BoardView';
import { AiCoach } from '@/components/AiCoach';
import { useGame } from '@/hooks/useGame';
import { SCENES, DIFFICULTIES } from '@/lib/board-constants';
import type { GameMode } from '@/lib/types';

export default function Home() {
  const game = useGame();

  if (game.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#1a1410] text-[#c9a84c]/50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-sm tracking-widest font-['KaiTi','STKaiti',serif]">灵弈启动中...</p>
      </div>
    );
  }

  if (game.status === 'error') {
    return (
      <div className="min-h-screen bg-[#1a1410] text-[#c9a84c]/50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-sm font-mono text-red-400/80">SYS ERR: {game.error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden"
      style={{
        background: [
          /* 不规则木纹高光区 — 模拟木料自然年轮变化 */
          'radial-gradient(ellipse 25% 90% at 18% 40%, rgba(255,210,130,0.07) 0%, transparent 70%)',
          'radial-gradient(ellipse 20% 75% at 75% 60%, rgba(255,200,100,0.05) 0%, transparent 65%)',
          'radial-gradient(ellipse 15% 50% at 45% 25%, rgba(0,0,0,0.05) 0%, transparent 60%)',
          /* 细木纹 — 间距不均匀增加自然感 */
          'repeating-linear-gradient(0deg, transparent 0px, rgba(0,0,0,0.022) 1px, transparent 3px, rgba(255,200,100,0.018) 7px, transparent 9px, transparent 15px)',
          /* 四角暗角 — 聚焦中心 */
          'radial-gradient(ellipse 88% 88% at 50% 50%, transparent 42%, rgba(0,0,0,0.5) 100%)',
          /* 顶部自然光 */
          'radial-gradient(ellipse 55% 30% at 50% 0%, rgba(210,170,100,0.2) 0%, transparent 70%)',
          /* 主木色 — 深胡桃木 */
          'linear-gradient(175deg, #7a5535 0%, #5c3e28 28%, #4a3020 58%, #3a2418 82%, #281808 100%)',
        ].join(','),
      }}>
      {/* 竖排书法卷轴 — left margin */}
      <div className="hidden lg:block fixed left-5 top-0 bottom-0 z-0 pointer-events-none select-none overflow-hidden"
        style={{ width: 28 }}>
        <div className="animate-scroll-calligraphy whitespace-nowrap pt-8"
          style={{ writingMode: 'vertical-rl', color: 'rgba(194,59,34,0.25)', fontSize: 13, lineHeight: 2, fontFamily: "'KaiTi','STKaiti','Noto Serif SC',serif" }}>
          <span>山僧对棋坐　　局上竹阴清　　映竹无人见　　时闻下子声&emsp;——白居易&emsp;&emsp;有约不来过夜半　　闲敲棋子落灯花&emsp;——赵师秀&emsp;&emsp;橘中秘云：棋虽曲艺，义颇精微&emsp;梅花谱曰：象棋一艺，通于兵法&emsp;观棋不语真君子，落子无悔大丈夫</span>
          <span>山僧对棋坐　　局上竹阴清　　映竹无人见　　时闻下子声&emsp;——白居易&emsp;&emsp;有约不来过夜半　　闲敲棋子落灯花&emsp;——赵师秀&emsp;&emsp;橘中秘云：棋虽曲艺，义颇精微&emsp;梅花谱曰：象棋一艺，通于兵法&emsp;观棋不语真君子，落子无悔大丈夫</span>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-3 md:p-4 space-y-3">

        {/* Header */}
        <header className="flex items-center justify-between px-1 py-2">
          <div>
            <h1 className="text-base font-['KaiTi','STKaiti',serif] tracking-wider text-[#c9a84c]/70">
              灵弈
            </h1>
            <p className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/30">AI × 中国象棋</p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/50">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${game.status === 'ready' ? 'bg-[#c23b22]' : 'bg-red-400/60'}`}
              style={{ boxShadow: game.status === 'ready' ? '0 0 4px rgba(194,59,34,0.3)' : 'none' }} />
            <span>{game.status === 'ready' ? '就绪' : '异常'}</span>
          </div>
        </header>

        {/* Main grid: board (left) + side panels (right) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Board - left 2/3 */}
          <div className="md:col-span-2">
            {game.board && (
              <BoardView
                board={game.board}
                selected={game.selected}
                moveTargets={game.moveTargets}
                boardScale={game.boardScale}
                boardScaleRef={game.boardScaleRef}
                aiThinking={game.aiThinking}
                lastMoveDesc={game.lastMoveDesc}
                moveCount={game.moveCount}
                score={game.score}
                isGameOver={game.isGameOver}
                mood={game.emotion}
                onMoodDismiss={() => game.setEmotion(null)}
                onCellClick={game.handleCellClick}
              />
            )}
          </div>

          {/* Side panels - right 1/3 */}
          <div className="flex flex-col gap-3">
            <ControlPanel
              gameMode={game.gameMode}
              difficulty={game.difficulty}
              soundOn={game.soundOn}
              speechOn={game.speechOn}
              onModeChange={game.setGameMode}
              onDifficultyChange={game.setDifficulty}
              onSoundToggle={game.setSoundOn}
              onSpeechToggle={game.setSpeechOn}
            />
            <AiCoach
              fen={game.fen}
              score={game.score}
              gameMode={game.gameMode}
              moveCount={game.moveCount}
            />
            {game.gameMode === 'pve' && game.aiStats.gamesPlayed > 0 && (
              <StatsPanel stats={game.aiStats} weaknesses={game.weaknesses} />
            )}
          </div>
        </div>

        {/* FEN input */}
        <FenInput
          fen={game.fen}
          onFenChange={game.analyzeFen}
        />
        <SceneStrip scenes={SCENES} onSelect={game.analyzeFen} />

        {/* Footer */}
        <div className="flex justify-between text-[8px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/25 tracking-wider px-1">
          <span>灵弈 v0.1.0</span>
          <span>引擎 {DIFFICULTIES[game.difficulty].depth} 层</span>
        </div>

      </div>
    </main>
  );
}

/* ─── Sub-components ─── */

function ControlPanel({
  gameMode, difficulty, soundOn, speechOn,
  onModeChange, onDifficultyChange,
  onSoundToggle, onSpeechToggle,
}: {
  gameMode: GameMode; difficulty: number;
  soundOn: boolean; speechOn: boolean;
  onModeChange: (m: GameMode) => void;
  onDifficultyChange: (d: number) => void;
  onSoundToggle: (v: boolean) => void;
  onSpeechToggle: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl p-3 bg-[#3a2a22]/55 backdrop-blur-md border border-[#c9a84c]/10 space-y-2.5">
      <span className="text-[9px] font-['KaiTi','STKaiti',serif] tracking-wider text-[#c9a84c]/40">
        对弈设置
      </span>

      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/45">模式</span>
        <div className="flex">
          {(['pvp', 'pve'] as const).map((mode) => (
            <button key={mode} onClick={() => onModeChange(mode)}
              className={`px-2 py-0.5 text-[10px] font-['KaiTi','STKaiti',serif] tracking-wider transition-all duration-150 border
                ${gameMode === mode
                  ? 'bg-[#c23b22]/10 text-[#c23b22]/60 border-[#c23b22]/25'
                  : 'bg-transparent text-[#c9a84c]/35 border-[#c9a84c]/10 hover:border-[#c23b22]/15'
                }`}>
              {mode === 'pvp' ? '双人对弈' : '人机对战'}
            </button>
          ))}
        </div>
      </div>

      {gameMode === 'pve' && (
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/45">难度</span>
          <div className="flex">
            {DIFFICULTIES.map((d, i) => (
              <button key={d.label} onClick={() => onDifficultyChange(i)}
                className={`px-2 py-0.5 text-[10px] font-['KaiTi','STKaiti',serif] tracking-wider transition-all duration-150 border
                  ${i < DIFFICULTIES.length - 1 ? 'border-r-0' : ''}
                  ${difficulty === i
                    ? 'bg-[#c23b22]/10 text-[#c23b22]/60 border-[#c23b22]/25'
                    : 'bg-transparent text-[#c9a84c]/35 border-[#c9a84c]/10 hover:border-[#c23b22]/15'
                  }`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/45">声音</span>
        <div className="flex gap-1">
          {[{ key: 'sound', label: '音效', on: soundOn, toggle: onSoundToggle },
            { key: 'speech', label: '语音', on: speechOn, toggle: onSpeechToggle },
          ].map(a => (
            <button key={a.key} onClick={() => a.toggle(!a.on)}
              className={`px-2 py-0.5 text-[10px] font-['KaiTi','STKaiti',serif] tracking-wider transition-all duration-150 border
                ${a.on
                  ? 'bg-[#c23b22]/10 text-[#c23b22]/50 border-[#c23b22]/20'
                  : 'bg-transparent text-[#c9a84c]/35 border-[#c9a84c]/10'
                }`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsPanel({ stats, weaknesses }: {
  stats: { gamesPlayed: number; wins: number; losses: number; draws: number };
  weaknesses: string[];
}) {
  return (
    <div className="rounded-xl p-3 bg-[#2a1e1b]/50 backdrop-blur-md border border-[#c9a84c]/8 space-y-2">
      <span className="text-[9px] font-['KaiTi','STKaiti',serif] tracking-wider text-[#c9a84c]/40">
        棋局统计
      </span>
      <dl className="grid grid-cols-4 gap-1 text-center">
        <div><dt className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/35">局数</dt>
          <dd className="text-xs font-mono text-[#c9a84c]/60">{stats.gamesPlayed}</dd></div>
        <div><dt className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/35">胜</dt>
          <dd className="text-xs font-mono text-[#c9a84c]/60">{stats.wins}</dd></div>
        <div><dt className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/35">负</dt>
          <dd className="text-xs font-mono text-[#c9a84c]/60">{stats.losses}</dd></div>
        <div><dt className="text-[9px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/35">和</dt>
          <dd className="text-xs font-mono text-[#c9a84c]/60">{stats.draws}</dd></div>
      </dl>
      {weaknesses.length > 0 && (
        <div className="pt-1.5 border-t border-[#c9a84c]/8">
          <div className="text-[8px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/30 mb-0.5">待改进</div>
          <ul className="space-y-0.5">
            {weaknesses.slice(0, 3).map((w, i) => (
              <li key={i} className="text-[10px] font-['KaiTi','STKaiti',serif] text-[#c9a84c]/50">▸ {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FenInput({ fen, onFenChange }: { fen: string; onFenChange: (v: string) => void }) {
  return (
    <div className="rounded-xl bg-[#3a2a22]/45 border border-[#c9a84c]/10 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#c9a84c]/6">
        <span className="text-[9px] font-['KaiTi','STKaiti',serif] tracking-wider text-[#c9a84c]/35">
          局势输入
        </span>
      </div>
      <textarea
        value={fen}
        onChange={(e) => onFenChange(e.target.value)}
        className="w-full bg-transparent text-[11px] font-mono text-[#c9a84c]/35 px-3 py-2
          placeholder:text-[#c9a84c]/25 resize-none focus:outline-none leading-relaxed"
        rows={2}
        placeholder="在此粘贴 FEN 局势代码..."
      />
    </div>
  );
}

function SceneStrip({ scenes, onSelect }: { scenes: typeof SCENES; onSelect: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {scenes.map((s) => (
        <button key={s.label} onClick={() => onSelect(s.fen)}
          className="px-2.5 py-1 text-[10px] font-['KaiTi','STKaiti',serif] tracking-wider
            bg-[#3a2a22]/40 border border-[#c9a84c]/10 text-[#c9a84c]/40
            hover:border-[#c23b22]/20 hover:text-[#c9a84c]/40
            transition-all duration-150 active:scale-[0.97] rounded-md">
          载入 {s.label}
        </button>
      ))}
    </div>
  );
}
