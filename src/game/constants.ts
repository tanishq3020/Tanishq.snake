import { ThemeConfig } from '../types/game';

export const GRID_SIZE = 26; // 26x26 grid

export const THEMES: Record<string, ThemeConfig> = {
  CYBER_NEON: {
    id: 'CYBER_NEON',
    name: 'Cyber Neon',
    headColor: '#00F0FF',
    bodyColor: '#0ea5e9',
    bodyAccent: '#38bdf8',
    eyeColor: '#ffffff',
    gridLineColor: 'rgba(0, 240, 255, 0.05)',
    bgDark: '#050a14',
    accentGlow: '#00F0FF',
    particleColor: '#38bdf8',
  },
  PHOSPHOR_MATRIX: {
    id: 'PHOSPHOR_MATRIX',
    name: 'Matrix Green',
    headColor: '#22c55e',
    bodyColor: '#16a34a',
    bodyAccent: '#4ade80',
    eyeColor: '#ffffff',
    gridLineColor: 'rgba(34, 197, 94, 0.06)',
    bgDark: '#040d07',
    accentGlow: '#22c55e',
    particleColor: '#4ade80',
  },
  SOLAR_FLARE: {
    id: 'SOLAR_FLARE',
    name: 'Solar Flare',
    headColor: '#f59e0b',
    bodyColor: '#d97706',
    bodyAccent: '#fbbf24',
    eyeColor: '#ffffff',
    gridLineColor: 'rgba(245, 158, 11, 0.06)',
    bgDark: '#120a04',
    accentGlow: '#f59e0b',
    particleColor: '#fbbf24',
  },
  VOID_PULSE: {
    id: 'VOID_PULSE',
    name: 'Void Pulse',
    headColor: '#d946ef',
    bodyColor: '#a855f7',
    bodyAccent: '#e879f9',
    eyeColor: '#ffffff',
    gridLineColor: 'rgba(217, 70, 239, 0.06)',
    bgDark: '#0f0517',
    accentGlow: '#d946ef',
    particleColor: '#e879f9',
  },
};

export const FOOD_COLORS: Record<string, { main: string; glow: string }> = {
  APPLE: { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)' },
  GOLDEN_CHIP: { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.85)' },
  GHOST_CHIP: { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)' },
  SPEED_SURGE: { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.75)' },
  SLOW_MO: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.75)' },
  MAGNET: { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.8)' },
};

export const COMBO_WINDOW_MS = 3600;
export const HITSTOP_MS = 65;
export const SHAKE_DECAY = 0.88;
