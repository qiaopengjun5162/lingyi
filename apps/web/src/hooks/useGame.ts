'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { BoardState, Move, GameMode, AIStats } from '@/lib/types';
import { START_FEN } from '@/lib/types';
import {
  fenToJson, getLegalMoves, evaluate,
  makeMove as wasmMakeMove, bestMove as wasmBestMove,
  initWasm,
} from '@/lib/wasm';
import { moveToNotation } from '@/lib/notation';
import {
  playMove, playCapture, playCheck, playCheckmate, playStalemate,
  speakNotation, speakAlert,
  setSoundEnabled, setSpeechEnabled,
} from '@/lib/sound';
import { lookup } from '@/lib/opening-book';
import {
  createGame, addStep, finishGame, calculateStats,
  summarizeWeaknesses, type GameRecord,
} from '@/lib/ai-training';
import { BASE_SVG_W, DIFFICULTIES } from '@/lib/board-constants';

export interface MoveTargets { moves: Move[]; captures: Move[] }

export function useGame() {
  // ─── Core game state ───
  const [fen, setFen] = useState(START_FEN);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [allLegalMoves, setAllLegalMoves] = useState<Move[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  // ─── Interaction state ───
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [lastMoveDesc, setLastMoveDesc] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ fromRow: number; fromCol: number; toRow: number; toCol: number } | null>(null);
  const [wrongSideMsg, setWrongSideMsg] = useState<string | null>(null);
  const wrongSideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── Mode state ───
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [difficulty, setDifficulty] = useState(1);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiStats, setAiStats] = useState<AIStats>({
    gamesPlayed: 0, wins: 0, losses: 0, draws: 0,
  });
  const [soundOn, setSoundOn] = useState(true);
  const [speechOn, setSpeechOn] = useState(true);

  // ─── Game recording ───
  const [currentGame, setCurrentGame] = useState<GameRecord | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const currentGameRef = useRef<GameRecord | null>(null);

  // ─── Board scale ───
  const boardScaleRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);

  // ─── Score history for advantage chart ───
  const [scoreHistory, setScoreHistory] = useState<number[]>([0]);

  // ─── Timer ───
  const TIME_OPTS = [
    { label: '3分', s: 180 },
    { label: '5分', s: 300 },
    { label: '10分', s: 600 },
  ] as const;
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeControl, setTimeControl] = useState(1);
  const [redTime, setRedTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [timedOut, setTimedOut] = useState<'red' | 'black' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timedOutRef = useRef<'red' | 'black' | null>(null);

  // ─── Three-fold repetition detection ───
  const fenHistoryRef = useRef<string[]>([]);
  const [repetitionDraw, setRepetitionDraw] = useState(false);

  // ─── Emotion (score-based mood bubble) ───
  const [emotion, setEmotion] = useState<{ type: 'blunder' | 'brilliant'; diff: number } | null>(null);
  const lastScoreRef = useRef(0);
  const pendingScoreRef = useRef<number | null>(null);

  // Refs keep latest values for async callbacks (AI, timers)
  const fenRef = useRef(fen);
  const boardRef = useRef(board);
  useEffect(() => { fenRef.current = fen; }, [fen]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);
  useEffect(() => { setSpeechEnabled(speechOn); }, [speechOn]);

  // ─── Board resize observer ───
  useEffect(() => {
    const el = boardScaleRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setBoardScale(Math.min(1.8, w / BASE_SVG_W));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Keep timedOut ref in sync
  useEffect(() => { timedOutRef.current = timedOut; }, [timedOut]);

  // Reset times when time control changes (intentional setState in effect for user-triggered reset)
   
  useEffect(() => {
    const newTime = TIME_OPTS[timeControl].s;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedTime(newTime);
     
    setBlackTime(newTime);
    setTimedOut(null);
    timedOutRef.current = null;
  }, [timeControl]);

  // Timer countdown — reads refs to avoid stale closure
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerEnabled) return;
    timerRef.current = setInterval(() => {
      if (timedOutRef.current || boardRef.current?.checkmate || boardRef.current?.stalemate) {
        clearInterval(timerRef.current);
        return;
      }
      if (boardRef.current?.side_to_move === 'red') {
        setRedTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerEnabled]);

  // Timeout detection
  useEffect(() => {
    if (!timerEnabled || timedOutRef.current || redTime > 0) return;
    setTimedOut('red');
    timedOutRef.current = 'red';
    speakAlert('红方超时，黑方胜');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redTime]);

  useEffect(() => {
    if (!timerEnabled || timedOutRef.current || blackTime > 0) return;
    setTimedOut('black');
    timedOutRef.current = 'black';
    speakAlert('黑方超时，红方胜');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blackTime]);

  // ─── analyzeFen — uses only refs and set* (stable), no deps ───
  const analyzeFen = useCallback((f: string) => {
    setFen(f);
    setSelected(null);
    try {
      const b = fenToJson(f);
      const moves = getLegalMoves(f);
      setBoard(b);
      setAllLegalMoves(moves);
      setMoveCount(moves.length);
      const newScore = evaluate(f);
      if (pendingScoreRef.current !== null) {
        const diff = newScore - pendingScoreRef.current;
        pendingScoreRef.current = null;
        if (diff < -200) {
          setEmotion({ type: 'blunder', diff: Math.abs(diff) });
        } else if (diff > 200) {
          setEmotion({ type: 'brilliant', diff });
        } else {
          setEmotion(null);
        }
      }
      lastScoreRef.current = newScore;
      setScore(newScore);
      setScoreHistory(prev => [...prev.slice(-299), newScore]);

      if (currentGameRef.current && (b.checkmate || b.stalemate)) {
        const result: GameRecord['result'] = b.checkmate
          ? (b.side_to_move === 'red' ? 'black_win' : 'red_win')
          : 'draw';
        finishGame(currentGameRef.current, result, f);
        currentGameRef.current = null;
        setCurrentGame(null);
        setAiStats(calculateStats());
        setWeaknesses(summarizeWeaknesses());
        if (b.checkmate) {
          playCheckmate();
          speakAlert(b.side_to_move === 'red' ? '将杀，黑方胜' : '将杀，红方胜');
        } else {
          playStalemate();
          speakAlert('困毙，和棋');
        }
      } else if (b.check) {
        playCheck();
        speakAlert('将军');
      }
    } catch (e: unknown) {
      setError(String(e));
    }
  }, []);

  // ─── WASM init ───
  useEffect(() => {
    initWasm()
      .then(() => {
        setStatus('ready');
        analyzeFen(START_FEN);
        setAiStats(calculateStats());
        setWeaknesses(summarizeWeaknesses());
      })
      .catch((e: Error) => {
        setStatus('error');
        setError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── triggerAI — AI 自动走棋（PVE 模式） ───
  const triggerAI = useCallback(() => {
    const b = boardRef.current;
    const f = fenRef.current;
    if (!b || !f || b.side_to_move !== 'black') return;
    setAiThinking(true);

    setTimeout(() => {
      let fromRow = 0, fromCol = 0, toRow = 0, toCol = 0;
      let found = false;

      const book = lookup(f);
      if (book && book.length > 0) {
        const entry = book[Math.floor(Math.random() * book.length)];
        fromRow = entry.from_row; fromCol = entry.from_col;
        toRow = entry.to_row; toCol = entry.to_col;
        found = true;
      }

      if (!found) {
        const depth = DIFFICULTIES[difficulty].depth;
        const result = wasmBestMove(f, depth);
        if (!result) { setAiThinking(false); return; }
        fromRow = result.from_row; fromCol = result.from_col;
        toRow = result.to_row; toCol = result.to_col;
      }

      const newFen = wasmMakeMove(f, fromRow, fromCol, toRow, toCol);
      fenHistoryRef.current.push(newFen);
      if (fenHistoryRef.current.filter(h => h === newFen).length >= 3) {
        setRepetitionDraw(true);
        speakAlert('三次重复，和棋');
      }
      const piece = b.rows[fromRow]?.[fromCol];
      const notation = piece
        ? moveToNotation(fromRow, fromCol, toRow, toCol, piece.piece_type, 'black')
        : `黑方 ${fromRow},${fromCol}→${toRow},${toCol}`;

      setLastMoveDesc(`黑方：${notation}`);
      setLastMove({ fromRow, fromCol, toRow, toCol });
      playMove();
      if (speechOn) speakNotation(notation);
      setAiThinking(false);
      pendingScoreRef.current = lastScoreRef.current;
      analyzeFen(newFen);

      if (currentGameRef.current) {
        addStep(currentGameRef.current, {
          fen: f, fromRow, fromCol, toRow, toCol,
          side: 'black', pieceType: '',
          scoreBefore: evaluate(f),
          scoreAfter: evaluate(newFen),
        });
      }
    }, 200);
  }, [difficulty, speechOn, analyzeFen]);

  // PVE 模式：轮到黑方时自动触发 AI
  useEffect(() => {
    if (gameMode === 'pve' && board && board.side_to_move === 'black'
      && !board.checkmate && !board.stalemate && !aiThinking) {
      triggerAI();
    }
  }, [board, gameMode, triggerAI, aiThinking]);

  // ─── moveTargets — 当前选中棋子的合法走法 ───
  const moveTargets: MoveTargets | null = useMemo(() => {
    if (!selected || allLegalMoves.length === 0) return null;
    const pieceMoves = allLegalMoves.filter(
      m => m.from_row === selected.row && m.from_col === selected.col,
    );
    const captures: Move[] = [];
    const moves: Move[] = [];
    for (const m of pieceMoves) {
      if (board?.rows[m.to_row]?.[m.to_col]) captures.push(m);
      else moves.push(m);
    }
    return { moves, captures };
  }, [selected, allLegalMoves, board]);

  // ─── handleCellClick — 交叉点点击处理器 ───
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!board || status !== 'ready' || aiThinking) return;
    if (gameMode === 'pve' && board.side_to_move !== 'red') return;

    const piece = board.rows[row]?.[col];

    if (moveTargets) {
      const isTarget = moveTargets.moves.some(m => m.to_row === row && m.to_col === col)
        || moveTargets.captures.some(m => m.to_row === row && m.to_col === col);
      if (isTarget) {
        const sel = selected!;
        const p = board.rows[sel.row]?.[sel.col];
        const notation = p
          ? moveToNotation(sel.row, sel.col, row, col, p.piece_type, p.side as 'red' | 'black')
          : `${sel.row},${sel.col}→${row},${col}`;
        const sideLabel = p?.side === 'red' ? '红方' : '黑方';

        const newFen = wasmMakeMove(fen, sel.row, sel.col, row, col);
        fenHistoryRef.current.push(newFen);
        if (fenHistoryRef.current.filter(f => f === newFen).length >= 3) {
          setRepetitionDraw(true);
          speakAlert('三次重复，和棋');
        }
        const captured = board.rows[row]?.[col];
        if (captured) playCapture();
        else playMove();
        setLastMoveDesc(`${sideLabel}：${notation}`);
        setLastMove({ fromRow: sel.row, fromCol: sel.col, toRow: row, toCol: col });
        if (speechOn) speakNotation(notation);

        pendingScoreRef.current = lastScoreRef.current;
        analyzeFen(newFen);

        if (p) {
          let game = currentGameRef.current;
          if (gameMode === 'pve' && !game) {
            game = createGame('pve', difficulty);
            currentGameRef.current = game;
            setCurrentGame(game);
          }
          if (game) {
            addStep(game, {
              fen,
              fromRow: sel.row, fromCol: sel.col,
              toRow: row, toCol: col,
              side: p.side as 'red' | 'black',
              pieceType: p.piece_type,
              scoreBefore: score,
              scoreAfter: evaluate(newFen),
            });
          }
        }
        return;
      }
    }

    if (piece && piece.side === board.side_to_move) {
      setSelected({ row, col });
      return;
    }

    if (piece && piece.side !== board.side_to_move) {
      const msg = board.side_to_move === 'red' ? '该红方走棋' : '该黑方走棋';
      setWrongSideMsg(msg);
      clearTimeout(wrongSideTimer.current);
      wrongSideTimer.current = setTimeout(() => setWrongSideMsg(null), 1500);
      return;
    }

    setSelected(null);
  }, [board, status, moveTargets, fen, selected, analyzeFen,
      aiThinking, gameMode, difficulty, score, speechOn]);

  const resetGame = useCallback(() => {
    setLastMove(null);
    setLastMoveDesc(null);
    setScoreHistory([0]);
    setRepetitionDraw(false);
    setTimedOut(null);
    timedOutRef.current = null;
    fenHistoryRef.current = [];
    const secs = TIME_OPTS[timeControl].s;
    setRedTime(secs);
    setBlackTime(secs);
    currentGameRef.current = null;
    setCurrentGame(null);
    analyzeFen(START_FEN);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzeFen, timeControl]);

  const isGameOver = !!(board?.checkmate || board?.stalemate || timedOut !== null || repetitionDraw);

  return {
    fen, board, status, error,
    selected, moveTargets, moveCount, score,
    lastMoveDesc, lastMove, wrongSideMsg,
    isGameOver, timedOut, repetitionDraw,
    gameMode, difficulty, aiThinking, aiStats,
    soundOn, speechOn,
    currentGame, weaknesses,
    emotion,
    boardScaleRef, boardScale, scoreHistory,
    timerEnabled, timeControl, redTime, blackTime, TIME_OPTS,
    analyzeFen, handleCellClick, setEmotion, resetGame,
    setGameMode, setDifficulty, setSoundOn, setSpeechOn,
    setTimerEnabled, setTimeControl,
    DIFFICULTIES,
  };
}
