export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'SECTOR_VICTORY';

export type GameMode = 'CLASSIC' | 'CAMPAIGN' | 'SPEED_BLITZ' | 'ZEN';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export type FoodType = 
  | 'APPLE'          // Standard food (+10)
  | 'GOLDEN_CHIP'    // Fleeting high value (+50, raises combo)
  | 'GHOST_CHIP'     // Pass through walls & body for 7s (+25)
  | 'SPEED_SURGE'    // Faster + trail sparks (+30)
  | 'SLOW_MO'        // Slows tick speed for precision (+20)
  | 'MAGNET'         // Magnetic pull radius (+25);

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  type: FoodType;
  spawnTime: number;
  duration?: number; // In ms for temporary items (e.g. golden chip)
  value: number;
  color: string;
  glowColor: string;
  pulsePhase?: number;
}

export type ObstacleType = 'WALL' | 'PORTAL' | 'HAZARD';

export interface Obstacle {
  x: number;
  y: number;
  type: ObstacleType;
  portalTarget?: Point;
  portalId?: number;
  active?: boolean;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  shape?: 'circle' | 'square' | 'spark' | 'ring';
  drag?: number;
  rotation?: number;
  vRot?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  scale: number;
}

export interface ActiveBuff {
  type: FoodType;
  remainingMs: number;
  totalMs: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  headColor: string;
  bodyColor: string;
  bodyAccent: string;
  eyeColor: string;
  gridLineColor: string;
  bgDark: string;
  accentGlow: string;
  particleColor: string;
}

export interface HighScoreRecord {
  score: number;
  mode: GameMode;
  date: string;
  length: number;
  sector?: number;
}

export interface SectorDefinition {
  id: number;
  name: string;
  targetApples: number;
  obstacles: Obstacle[];
  baseSpeedMs: number;
  hasWrapWalls: boolean;
  description: string;
}
