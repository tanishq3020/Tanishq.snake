import React from 'react';
import { RotateCcw, Home, Trophy, Target, Zap, Clock } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface GameOverModalProps {
  summary: {
    score: number;
    highScore: number;
    length: number;
    applesEaten: number;
    maxCombo: number;
    timeAliveSec: number;
    isNewHighScore: boolean;
    cause: string;
  };
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  onPlayAgain,
  onReturnToTitle,
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getCauseText = (cause: string) => {
    switch (cause) {
      case 'WALL_COLLISION':
        return 'Perimeter Breach';
      case 'OBSTACLE_COLLISION':
        return 'Barrier Impact';
      case 'SELF_COLLISION':
        return 'Neural Self-Intersection';
      default:
        return 'Signal Lost';
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="w-full max-w-md p-6 sm:p-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center flex flex-col items-center">
        {/* Cause & Status */}
        <div className="text-[11px] font-mono tracking-widest uppercase text-rose-400 font-bold">
          TERMINATION: {getCauseText(summary.cause)}
        </div>

        <h2 className="mt-1 text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-100 uppercase">
          GAME OVER
        </h2>

        {summary.isNewHighScore && (
          <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 font-mono text-xs font-bold tracking-wider animate-pulse">
            <Trophy className="w-3.5 h-3.5" />
            <span>NEW ALL-TIME RECORD!</span>
          </div>
        )}

        {/* Primary Final Score Display */}
        <div className="my-5 flex flex-col items-center">
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-cyan-300 drop-shadow-[0_0_16px_rgba(0,240,255,0.4)] tabular-nums">
            {summary.score.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-slate-500 tracking-widest mt-1">FINAL SCORE</span>
        </div>

        {/* Run Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-6">
          <div className="flex flex-col items-center p-2 rounded bg-slate-900/50">
            <Target className="w-3.5 h-3.5 text-cyan-400 mb-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Apples</span>
            <span className="text-sm font-mono font-bold text-slate-200 tabular-nums">{summary.applesEaten}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded bg-slate-900/50">
            <Zap className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Max Combo</span>
            <span className="text-sm font-mono font-bold text-slate-200 tabular-nums">x{summary.maxCombo}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded bg-slate-900/50">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px] font-mono text-emerald-400 mb-1">
              LEN
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Length</span>
            <span className="text-sm font-mono font-bold text-slate-200 tabular-nums">{summary.length}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded bg-slate-900/50">
            <Clock className="w-3.5 h-3.5 text-indigo-400 mb-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Survival</span>
            <span className="text-sm font-mono font-bold text-slate-200 tabular-nums">{formatTime(summary.timeAliveSec)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-2.5">
          <button
            onClick={() => {
              soundManager.playUiClick();
              onPlayAgain();
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN (ENTER / SPACE)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onReturnToTitle();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>RETURN TO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
