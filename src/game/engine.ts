export type ShotZone = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type KeeperDirection = 'left' | 'center' | 'right';
export type ShotOutcome = 'goal' | 'save' | 'miss' | 'post';
export type GameMode = 'classic' | 'arcade';

export interface TeamConfig {
  id: string;
  name: string;
  shortName: string;
  nickname: string;
  primary: string;
  secondary: string;
}

export interface GameConfig {
  mode: GameMode;
  teamId: string;
  version: number;
  seed: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface ShotResult {
  zone: ShotZone;
  power: number;
  keeperDir: KeeperDirection;
  outcome: ShotOutcome;
  keeperX: number;
  keeperY: number;
  ballX: number;
  ballY: number;
  timestamp: number;
}

export interface GameState {
  mode: GameMode;
  teamId: string;
  version: number;
  seed: number;
  difficulty: 'easy' | 'normal' | 'hard';
  shotsTaken: number;
  maxShots: number;
  score: number;
  streak: number;
  bestStreak: number;
  saves: number;
  misses: number;
  posts: number;
  level: number;
  results: ShotResult[];
  status: 'aiming' | 'shooting' | 'result' | 'finished';
  currentResult: ShotResult | null;
}

export const GAME_VERSION = 1;
export const MAX_SHOTS_CLASSIC = 5;

export const TEAMS: TeamConfig[] = [
  { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', nickname: 'The Gunners', primary: '#EF0107', secondary: '#FFFFFF' },
  { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', nickname: 'The Reds', primary: '#C8102E', secondary: '#F6EB61' },
  { id: 'mancity', name: 'Manchester City', shortName: 'MCI', nickname: 'The Citizens', primary: '#6CABDD', secondary: '#1C2C5B' },
  { id: 'chelsea', name: 'Chelsea', shortName: 'CHE', nickname: 'The Blues', primary: '#034694', secondary: '#FFFFFF' },
  { id: 'barcelona', name: 'Barcelona', shortName: 'BAR', nickname: 'Barça', primary: '#A50044', secondary: '#004D98' },
  { id: 'realmadrid', name: 'Real Madrid', shortName: 'RMA', nickname: 'Los Blancos', primary: '#FFFFFF', secondary: '#FEBE10' },
];

const ZONE_COORDS: Record<ShotZone, { x: number; y: number }> = {
  'top-left': { x: -0.28, y: -0.32 },
  'top-center': { x: 0, y: -0.34 },
  'top-right': { x: 0.28, y: -0.32 },
  'bottom-left': { x: -0.3, y: -0.05 },
  'bottom-center': { x: 0, y: -0.03 },
  'bottom-right': { x: 0.3, y: -0.05 },
};

const ZONES: ShotZone[] = [
  'top-left', 'top-center', 'top-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

export function createGameState(config: GameConfig): GameState {
  return {
    mode: config.mode,
    teamId: config.teamId,
    version: config.version,
    seed: config.seed,
    difficulty: config.difficulty,
    shotsTaken: 0,
    maxShots: config.mode === 'classic' ? MAX_SHOTS_CLASSIC : Infinity,
    score: 0,
    streak: 0,
    bestStreak: 0,
    saves: 0,
    misses: 0,
    posts: 0,
    level: 1,
    results: [],
    status: 'aiming',
    currentResult: null,
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getKeeperSpeed(level: number, difficulty: string): number {
  const base = difficulty === 'easy' ? 0.25 : difficulty === 'normal' ? 0.4 : 0.55;
  return Math.min(base + level * 0.04, 0.85);
}

export function takeShot(
  state: GameState,
  zone: ShotZone,
  power: number
): { newState: GameState; result: ShotResult } {
  if (state.status !== 'aiming') return { newState: state, result: state.currentResult! };

  const rng = seededRandom(state.seed + state.shotsTaken * 7919 + 1);
  const keeperSpeed = getKeeperSpeed(state.level, state.difficulty);
  const coords = ZONE_COORDS[zone];

  let keeperDir: KeeperDirection;
  const rand = rng();
  const guessBias = keeperSpeed;
  const shotZoneIndex = ZONES.indexOf(zone);

  if (rand < guessBias) {
    if (shotZoneIndex < 3) keeperDir = rng() < 0.5 ? 'left' : 'right';
    else keeperDir = rng() < 0.5 ? 'left' : 'right';
    if (shotZoneIndex === 0 || shotZoneIndex === 3) keeperDir = 'left';
    if (shotZoneIndex === 2 || shotZoneIndex === 5) keeperDir = 'right';
    if (shotZoneIndex === 1 || shotZoneIndex === 4) keeperDir = rng() < 0.5 ? 'left' : 'right';
  } else {
    keeperDir = rng() < 0.33 ? 'left' : rng() < 0.5 ? 'center' : 'right';
  }

  const keeperZoneMatch =
    (keeperDir === 'left' && (zone === 'top-left' || zone === 'bottom-left')) ||
    (keeperDir === 'right' && (zone === 'top-right' || zone === 'bottom-right')) ||
    (keeperDir === 'center' && (zone === 'top-center' || zone === 'bottom-center'));

  let outcome: ShotOutcome;
  const keeperReach = keeperSpeed * (0.6 + rng() * 0.3);
  const powerFactor = Math.min(Math.max(power, 0.2), 1);

  if (keeperZoneMatch && rng() < keeperReach * (1 - powerFactor * 0.3)) {
    outcome = 'save';
  } else if (power < 0.25 && rng() < 0.3) {
    outcome = 'miss';
  } else if (power > 0.92 && rng() < 0.12) {
    outcome = 'post';
  } else {
    outcome = 'goal';
  }

  const result: ShotResult = {
    zone,
    power,
    keeperDir,
    outcome,
    keeperX: keeperDir === 'left' ? -0.22 : keeperDir === 'right' ? 0.22 : 0,
    keeperY: keeperDir === 'left' || keeperDir === 'right' ? -0.15 : -0.05,
    ballX: coords.x + (outcome === 'miss' ? (rng() - 0.5) * 0.15 : 0),
    ballY: coords.y,
    timestamp: Date.now(),
  };

  const newState: GameState = {
    ...state,
    shotsTaken: state.shotsTaken + 1,
    score: state.score + (outcome === 'goal' ? 1 : 0),
    streak: outcome === 'goal' ? state.streak + 1 : 0,
    bestStreak: outcome === 'goal' ? Math.max(state.bestStreak, state.streak + 1) : state.bestStreak,
    saves: state.saves + (outcome === 'save' ? 1 : 0),
    misses: state.misses + (outcome === 'miss' ? 1 : 0),
    posts: state.posts + (outcome === 'post' ? 1 : 0),
    level: state.level + (outcome === 'goal' ? 1 : 0),
    results: [...state.results, result],
    status: 'shooting',
    currentResult: result,
  };

  return { newState, result };
}

export function advanceState(state: GameState): GameState {
  if (state.status === 'shooting') {
    return { ...state, status: 'result' };
  }
  if (state.status === 'result') {
    if (state.mode === 'classic' && state.shotsTaken >= state.maxShots) {
      return { ...state, status: 'finished' };
    }
    return { ...state, status: 'aiming', currentResult: null };
  }
  return state;
}

export function isGameFinished(state: GameState): boolean {
  return state.status === 'finished';
}

export function getFinalScore(state: GameState): { score: number; bestStreak: number; saves: number; misses: number; posts: number } {
  return {
    score: state.score,
    bestStreak: state.bestStreak,
    saves: state.saves,
    misses: state.misses,
    posts: state.posts,
  };
}

export function generateChallengeCode(config: GameConfig): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const payload = `${config.mode[0]}${config.teamId.slice(0, 3).toUpperCase()}${config.difficulty[0]}${config.version}${config.seed}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) & 0xffff;
  }
  let code = '';
  let h = hash + config.seed;
  for (let i = 0; i < 6; i++) {
    h = (h * 31 + i * 7) & 0xfffffff;
    code += chars[h % chars.length];
  }
  return `RY-${code}`;
}

export function decodeChallengeCode(code: string): GameConfig | null {
  try {
    const cleaned = code.replace(/\s/g, '').replace(/^RY-/, '');
    if (cleaned.length < 8) return null;
    const mode: GameMode = cleaned[0] === 'a' ? 'arcade' : 'classic';
    const teamIdPart = cleaned.slice(1, 4).toLowerCase();
    const team = TEAMS.find((t) => t.id.slice(0, 3).toLowerCase() === teamIdPart);
    const difficultyChar = cleaned[4];
    const difficulty = difficultyChar === 'h' ? 'hard' : difficultyChar === 'e' ? 'easy' : 'normal';
    const version = parseInt(cleaned[5]) || GAME_VERSION;
    const seed = parseInt(cleaned.slice(6)) || Math.floor(Math.random() * 99999);
    return {
      mode,
      teamId: team?.id ?? 'arsenal',
      version,
      seed,
      difficulty,
    };
  } catch {
    return null;
  }
}

export function createGameConfig(
  mode: GameMode,
  teamId: string,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): GameConfig {
  return {
    mode,
    teamId,
    version: GAME_VERSION,
    seed: Math.floor(Math.random() * 99999),
    difficulty,
  };
}
