import React from 'react';
import { ActiveBuff, GameMode } from '../types/game';
import { Volume2, VolumeX, Pause, Zap, Shield, Magnet, Clock, Sparkles } from 'lucide-react';

interface HUDProps {
  score: number;
  highScore: number;
  length: number;
  combo: number;
  comboProgress: number; // 0 to 1
  applesEaten: number;
  sector: number;
  targetApples: number;
  activeBuffs: ActiveBuff[];
  gameMode: GameMode;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  length,
  combo,
  comboProgress,
  applesEaten,
  sector,
  targetApples,
  activeBuffs,
  gameMode,
  isMuted,
  onToggleMute,
  onPause,
}) => {
  const getBuffIcon = (type: string) => {
    switch (type) {
      case 'GHOST_CHIP':
        return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      case 'SPEED_SURGE':
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case 'SLOW_MO':
        return <Clock className="w-3.5 h-3.5 text-emerald-400" />;
      case 'MAGNET':
        return <Magnet className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getBuffLabel = (type: string) => {
    switch (type) {
      case 'GHOST_CHIP':
        return 'GHOST';
      case 'SPEED_SURGE':
        return 'SURGE';
      case 'SLOW_MO':
        return 'SLOW-MO';
      case 'MAGNET':
        return 'MAGNET';
      default:
        return 'BOOST';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & High Score */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-cyan-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] tabular-nums">
              {score.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-cyan-500/80 uppercase tracking-widest">PTS</span>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-slate-400">
            <span>HI <span className="text-slate-200 font-bold tabular-nums">{highScore.toLocaleString()}</span></span>
            {gameMode === 'CAMPAIGN' && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-400 font-semibold">
                  SEC 0{sector} ({applesEaten}/{targetApples})
                </span>
              </>
            )}
            {gameMode === 'ZEN' && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium">ZEN</span>
              </>
            )}
            {gameMode === 'SPEED_BLITZ' && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-bold">BLITZ</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Combo Multiplier & Active Buffs */}
        <div className="flex flex-col items-center">
          {combo > 1 && (
            <div className="flex flex-col items-center mb-1.5 animate-bounce">
              <div className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-black text-sm tracking-wider tabular-nums shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                COMBO x{combo}
              </div>
              {/* Combo depletion bar */}
              <div className="w-20 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${comboProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Active Buffs Pill Strip */}
          {activeBuffs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {activeBuffs.map((buff) => {
                const sec = Math.ceil(buff.remainingMs / 1000);
                return (
                  <div
                    key={buff.type}
                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/90 border border-slate-700/80 rounded text-[11px] font-mono text-slate-200"
                  >
                    {getBuffIcon(buff.type)}
                    <span className="font-semibold">{getBuffLabel(buff.type)}</span>
                    <span className="text-cyan-400 font-bold tabular-nums">{sec}s</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Length / Eaten & Controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="hidden sm:flex flex-col text-right font-mono text-xs">
            <span className="text-slate-400">LENGTH <span className="text-slate-200 font-bold tabular-nums">{length}</span></span>
            <span className="text-slate-400">APPLES <span className="text-slate-200 font-bold tabular-nums">{applesEaten}</span></span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/70 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label="Toggle Mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={onPause}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/70 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
              title="Pause Game (Esc / Space)"
              aria-label="Pause Game"
            >
              <Pause className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
