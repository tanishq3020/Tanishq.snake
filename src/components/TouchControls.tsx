import React from 'react';
import { Direction } from '../types/game';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface TouchControlsProps {
  onDirection: (dir: Direction) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onDirection }) => {
  return (
    <div className="md:hidden absolute bottom-5 left-0 right-0 flex justify-center items-center pointer-events-none z-10">
      <div className="grid grid-cols-3 gap-2 w-48 p-2 bg-slate-900/60 backdrop-blur-xs border border-slate-800/80 rounded-2xl pointer-events-auto select-none touch-none">
        {/* Row 1 */}
        <div />
        <button
          onClick={() => onDirection('UP')}
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('UP');
          }}
          className="flex items-center justify-center h-12 bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-slate-200 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          aria-label="Up"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div />

        {/* Row 2 */}
        <button
          onClick={() => onDirection('LEFT')}
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('LEFT');
          }}
          className="flex items-center justify-center h-12 bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-slate-200 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          aria-label="Left"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => onDirection('DOWN')}
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('DOWN');
          }}
          className="flex items-center justify-center h-12 bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-slate-200 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          aria-label="Down"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
        <button
          onClick={() => onDirection('RIGHT')}
          onTouchStart={(e) => {
            e.preventDefault();
            onDirection('RIGHT');
          }}
          className="flex items-center justify-center h-12 bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-slate-200 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          aria-label="Right"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
