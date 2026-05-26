'use client';

import type { GameMode, AIStats } from './types';

export interface StepRecord {
  fen: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  side: 'red' | 'black';
  pieceType: string;
  scoreBefore: number;
  scoreAfter: number;
}

export interface GameRecord {
  id: string;
  timestamp: number;
  mode: GameMode;
  difficulty: number;
  steps: StepRecord[];
  result: 'red_win' | 'black_win' | 'draw' | 'in_progress';
  finalFen: string;
}

export interface MistakeAnalysis {
  stepIndex: number;
  side: 'red' | 'black';
  scoreDrop: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  severity: 'minor' | 'major' | 'blunder';
}

export interface TrainingData {
  games: GameRecord[];
}

const STORAGE_KEY = 'lingyi_ai_training';
const MAX_GAMES = 100;

function loadData(): TrainingData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TrainingData;
  } catch { /* ignore */ }
  return { games: [] };
}

function saveData(data: TrainingData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('AI training: localStorage full, clearing old games');
    data.games = data.games.slice(-50);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* give up */ }
  }
}

export function createGame(mode: GameMode, difficulty: number): GameRecord {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    mode,
    difficulty,
    steps: [],
    result: 'in_progress',
    finalFen: '',
  };
}

export function addStep(game: GameRecord, step: StepRecord): void {
  game.steps.push(step);
}

export function finishGame(game: GameRecord, result: GameRecord['result'], finalFen: string): void {
  game.result = result;
  game.finalFen = finalFen;
  const data = loadData();
  data.games.unshift(game);
  if (data.games.length > MAX_GAMES) {
    data.games = data.games.slice(0, MAX_GAMES);
  }
  saveData(data);
}

export function getAllGames(): GameRecord[] {
  return loadData().games;
}

export function getRecentGames(count = 10): GameRecord[] {
  return loadData().games.slice(0, count);
}

export function calculateStats(): AIStats {
  const games = loadData().games;
  const pveGames = games.filter(g => g.mode === 'pve' && g.result !== 'in_progress');
  return {
    gamesPlayed: pveGames.length,
    wins: pveGames.filter(g => g.result === 'black_win').length,
    losses: pveGames.filter(g => g.result === 'red_win').length,
    draws: pveGames.filter(g => g.result === 'draw').length,
  };
}

export function analyzeMistakes(game: GameRecord, threshold = 50): MistakeAnalysis[] {
  const mistakes: MistakeAnalysis[] = [];
  for (let i = 0; i < game.steps.length; i++) {
    const step = game.steps[i];
    const drop = step.scoreBefore - step.scoreAfter;
    if (drop > threshold) {
      mistakes.push({
        stepIndex: i,
        side: step.side,
        scoreDrop: drop,
        fromRow: step.fromRow,
        fromCol: step.fromCol,
        toRow: step.toRow,
        toCol: step.toCol,
        severity: drop > 300 ? 'blunder' : drop > 150 ? 'major' : 'minor',
      });
    }
  }
  return mistakes;
}

export function summarizeWeaknesses(): string[] {
  const games = loadData().games;
  const pveGames = games.filter(g => g.mode === 'pve' && g.result !== 'in_progress');
  if (pveGames.length === 0) return [];

  const allMistakes: MistakeAnalysis[] = [];
  for (const game of pveGames) {
    allMistakes.push(...analyzeMistakes(game));
  }

  const humanMistakes = allMistakes.filter(m => m.side === 'red');
  if (humanMistakes.length === 0) return ['暂无足够数据'];

  const blunders = humanMistakes.filter(m => m.severity === 'blunder');
  const majors = humanMistakes.filter(m => m.severity === 'major');
  const avgDrop = humanMistakes.reduce((s, m) => s + m.scoreDrop, 0) / humanMistakes.length;

  const summaries: string[] = [];
  if (blunders.length > 0) {
    summaries.push(`平均每局 ${(blunders.length / pveGames.length).toFixed(1)} 个重大失误`);
  }
  if (avgDrop > 100) {
    summaries.push(`平均每步损失 ${avgDrop.toFixed(0)} 分，中局计算需加强`);
  }
  if (majors.length > blunders.length) {
    summaries.push('中等失误偏多，建议提高局势判断能力');
  }
  if (summaries.length === 0) {
    summaries.push('近期表现稳定，继续实战积累');
  }
  return summaries;
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
