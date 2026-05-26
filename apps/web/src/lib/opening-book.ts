'use client';

import openings from './classic-games.json';

interface OpeningMove {
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
  notation?: string;
  comment?: string;
}

interface OpeningEntry {
  fen: string;
  name: string;
  source: string;
  category: string;
  best_moves: OpeningMove[];
}

function normalizeFen(fen: string): string {
  return fen.split(' ').slice(0, 2).join(' ');
}

export function lookup(fen: string): OpeningMove[] | null {
  const target = normalizeFen(fen);
  for (const entry of openings as OpeningEntry[]) {
    if (normalizeFen(entry.fen) === target) {
      return entry.best_moves;
    }
  }
  return null;
}

export function lookupName(fen: string): string | null {
  const target = normalizeFen(fen);
  for (const entry of openings as OpeningEntry[]) {
    if (normalizeFen(entry.fen) === target) {
      return entry.name;
    }
  }
  return null;
}
