import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  score: number;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToTitle,
  isMuted,
  onToggleMute,
  score,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/75">
      <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center flex flex-col items-center">
        <h2 className="text-2xl font-black font-mono tracking-widest text-cyan-400 uppercase">
          SIMULATION PAUSED
        </h2>
        <p className="mt-1 text-xs font-mono text-slate-400">
          CURRENT SCORE: <span className="text-cyan-300 font-bold tabular-nums">{score.toLocaleString()}</span>
        </p>

        <div className="mt-6 flex flex-col w-full gap-2.5">
          <button
            onClick={() => {
              soundManager.playUiClick();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME (ESC / SPACE)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>RESTART RUN</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onReturnToTitle();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>MAIN MENU</span>
          </button>
        </div>

        <button
          onClick={onToggleMute}
          className="mt-4 flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
        </button>
      </div>
    </div>
  );
};
