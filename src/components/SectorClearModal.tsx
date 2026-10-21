import React from 'react';
import { ArrowRight, Trophy, Home } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface SectorClearModalProps {
  sectorId: number;
  nextSectorId: number | null;
  score: number;
  onNextSector: () => void;
  onReturnToTitle: () => void;
}

export const SectorClearModal: React.FC<SectorClearModalProps> = ({
  sectorId,
  nextSectorId,
  score,
  onNextSector,
  onReturnToTitle,
}) => {
  const isFinalSector = nextSectorId === null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/85">
      <div className="w-full max-w-md p-6 sm:p-7 bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl text-center flex flex-col items-center">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-cyan-300 font-mono text-xs font-bold tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isFinalSector ? 'CAMPAIGN CONQUERED!' : 'OBJECTIVE ACHIEVED'}</span>
        </div>

        <h2 className="text-3xl font-black font-mono tracking-widest text-white uppercase">
          SECTOR 0{sectorId} CLEARED
        </h2>

        <p className="mt-2 text-xs font-mono text-slate-400 max-w-xs">
          {isFinalSector
            ? 'All grid nodes normalized. You have mastered the cyber labyrinth.'
            : 'Perimeter neutralized. Proceeding to next hostile sector coordinates.'}
        </p>

        <div className="my-6 flex flex-col items-center p-4 bg-slate-950/60 border border-slate-800 rounded-xl w-full">
          <span className="text-xs font-mono text-slate-500 uppercase">CUMULATIVE SCORE</span>
          <span className="text-4xl font-black font-mono tracking-tight text-cyan-300 tabular-nums mt-1">
            {score.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col w-full gap-2.5">
          {!isFinalSector ? (
            <button
              onClick={() => {
                soundManager.playUiClick();
                onNextSector();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <span>ADVANCE TO SECTOR 0{nextSectorId}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                soundManager.playUiClick();
                onReturnToTitle();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>CLAIM VICTORY & RETURN</span>
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playUiClick();
              onReturnToTitle();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
