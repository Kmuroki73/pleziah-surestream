import { GAME_VERSION } from './engine';

const BEST_SCORE_KEY = 'surestream_penalty_rush_best';
const MUTE_KEY = 'surestream_penalty_rush_muted';
const GAMES_PLAYED_KEY = 'surestream_penalty_rush_games';

export interface BestScores {
  classic: number;
  arcade: number;
}

export function getBestScores(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (!raw) return { classic: 0, arcade: 0 };
    const parsed = JSON.parse(raw) as BestScores;
    return {
      classic: parsed.classic ?? 0,
      arcade: parsed.arcade ?? 0,
    };
  } catch {
    return { classic: 0, arcade: 0 };
  }
}

export function saveBestScore(mode: string, score: number): BestScores {
  const current = getBestScores();
  if (mode === 'classic' && score > current.classic) {
    current.classic = score;
  } else if (mode === 'arcade' && score > current.arcade) {
    current.arcade = score;
  }
  try {
    localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(current));
  } catch { /* storage unavailable */ }
  return current;
}

export function getMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMutedState(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch { /* storage unavailable */ }
}

export function incrementGamesPlayed(): number {
  try {
    const current = parseInt(localStorage.getItem(GAMES_PLAYED_KEY) ?? '0', 10);
    const next = current + 1;
    localStorage.setItem(GAMES_PLAYED_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export { GAME_VERSION };
