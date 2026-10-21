import React from 'react';
import { GameMode } from '../types/game';
import { THEMES } from '../game/constants';
import { Volume2, VolumeX, Trophy, Play, Shield, Zap, Sparkles } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface TitleScreenProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  selectedTheme: string;
  onSelectTheme: (themeId: string) => void;
  onStartGame: () => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentMode,
  onSelectMode,
  selectedTheme,
  onSelectTheme,
  onStartGame,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 pointer-events-none z-10">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full">
        {/* High Score Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm pointer-events-auto">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Record</span>
          <span className="text-sm font-mono font-bold text-amber-300 tabular-nums">{highScore.toLocaleString()}</span>
        </div>

        {/* Audio Mute Button */}
        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 transition-colors pointer-events-auto cursor-pointer"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center select-none pointer-events-none">
        {/* Bespoke Geometric Viper Arcade Lockup */}
        <div className="relative mb-3 flex flex-col items-center">
          <svg className="w-24 h-24 md:w-28 md:h-28 text-cyan-400 drop-shadow-[0_0_24px_rgba(0,240,255,0.6)]" viewBox="0 0 100 100" fill="none">
            {/* Cyber Snake Head / Crest */}
            <path
              d="M50 10 L82 32 L82 68 L50 90 L18 68 L18 32 Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="opacity-70"
            />
            <path
              d="M50 20 L72 38 L72 62 L50 78 L28 62 L28 38 Z"
              stroke="#38bdf8"
              strokeWidth="2"
              fill="rgba(6, 182, 212, 0.12)"
            />
            {/* Viper Venom Fangs */}
            <path d="M42 42 L42 54 L38 52" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M58 42 L58 54 L62 52" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            {/* Center Core */}
            <circle cx="50" cy="48" r="4" fill="#00f0ff" className="animate-pulse" />
          </svg>

          <h1 className="mt-2 text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 font-mono drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]">
            NEO·VIPER
          </h1>
          <p className="text-xs sm:text-sm text-cyan-300/80 tracking-[0.3em] uppercase font-mono mt-1">
            Cybernetic Arcade Simulation
          </p>
        </div>

        {/* Start Game Action Button */}
        <div className="mt-6 flex flex-col items-center gap-3 pointer-events-auto">
          <button
            onClick={() => {
              soundManager.playUiClick();
              onStartGame();
            }}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-base tracking-wider rounded-xl shadow-[0_0_28px_rgba(6,182,212,0.45)] hover:shadow-[0_0_38px_rgba(6,182,212,0.7)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START MISSION</span>
          </button>
          
          <div className="text-xs font-mono text-slate-400 tracking-wider">
            Press <span className="text-cyan-300 font-semibold">SPACE</span> or <span className="text-cyan-300 font-semibold">ENTER</span> to Engage
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl pointer-events-auto shadow-xl">
          <button
            onClick={() => {
              soundManager.playUiClick();
              onSelectMode('CLASSIC');
            }}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              currentMode === 'CLASSIC'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Classic
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onSelectMode('CAMPAIGN');
            }}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              currentMode === 'CAMPAIGN'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Campaign (6 Sectors)
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onSelectMode('SPEED_BLITZ');
            }}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              currentMode === 'SPEED_BLITZ'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Speed Blitz
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onSelectMode('ZEN');
            }}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              currentMode === 'ZEN'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Zen Flow
          </button>
        </div>

        {/* Theme Palette Chooser */}
        <div className="mt-4 flex items-center gap-2 pointer-events-auto">
          <span className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">Chassis:</span>
          {Object.values(THEMES).map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                soundManager.playUiClick();
                onSelectTheme(theme.id);
              }}
              title={theme.name}
              className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                selectedTheme === theme.id ? 'scale-125 border-white shadow-[0_0_10px_white]' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: theme.headColor }}
              aria-label={`Select ${theme.name} theme`}
            />
          ))}
        </div>
      </div>

      {/* Flat World-Matched Control Hint Line */}
      <div className="w-full text-center pb-2 pointer-events-none">
        <p className="text-xs font-mono text-slate-400 tracking-wider">
          WASD / Arrow Keys Navigate · Space Action · Esc Pause
        </p>
      </div>
    </div>
  );
};
