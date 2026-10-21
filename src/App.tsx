import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameMode, GameState, ActiveBuff, Direction } from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { SectorClearModal } from './components/SectorClearModal';
import { TouchControls } from './components/TouchControls';
import { soundManager } from './audio/soundManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [selectedTheme, setSelectedTheme] = useState<string>('CYBER_NEON');
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  // HUD stats
  const [stats, setStats] = useState({
    score: 0,
    highScore: 0,
    length: 4,
    combo: 1,
    comboProgress: 0,
    applesEaten: 0,
    sector: 1,
    targetApples: 12,
    activeBuffs: [] as ActiveBuff[],
    gameMode: 'CLASSIC' as GameMode,
    elapsedSeconds: 0,
  });

  // Game over summary
  const [gameOverSummary, setGameOverSummary] = useState<{
    score: number;
    highScore: number;
    length: number;
    applesEaten: number;
    maxCombo: number;
    timeAliveSec: number;
    isNewHighScore: boolean;
    cause: string;
  } | null>(null);

  // Sector victory summary
  const [victorySummary, setVictorySummary] = useState<{
    sectorId: number;
    nextSectorId: number | null;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (newState) => {
        setGameState(newState);
      },
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onGameOver: (summary) => {
        setGameOverSummary(summary);
      },
      onSectorVictory: (sectorId, nextSectorId) => {
        setVictorySummary({ sectorId, nextSectorId });
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.setMode(gameMode);
    engineRef.current.setTheme(selectedTheme);
    engineRef.current.startNewGame(gameMode, 0);
  }, [gameMode, selectedTheme]);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setGameMode(mode);
    if (engineRef.current) {
      engineRef.current.setMode(mode);
    }
  }, []);

  const handleSelectTheme = useCallback((themeId: string) => {
    setSelectedTheme(themeId);
    if (engineRef.current) {
      engineRef.current.setTheme(themeId);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startNewGame(gameMode, 0);
  }, [gameMode]);

  const handleReturnToTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleNextSector = useCallback(() => {
    if (!engineRef.current || !victorySummary || victorySummary.nextSectorId === null) return;
    engineRef.current.startNewGame('CAMPAIGN', victorySummary.nextSectorId);
  }, [victorySummary]);

  const handleDirection = useCallback((dir: Direction) => {
    engineRef.current?.queueDirection(dir);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050a14] select-none">
      {/* Isolated 60fps Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full cursor-crosshair touch-none"
      />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && (
        <TitleScreen
          currentMode={gameMode}
          onSelectMode={handleSelectMode}
          selectedTheme={selectedTheme}
          onSelectTheme={handleSelectTheme}
          onStartGame={handleStartGame}
          highScore={stats.highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active In-Game Low-Occlusion HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <HUD
          score={stats.score}
          highScore={stats.highScore}
          length={stats.length}
          combo={stats.combo}
          comboProgress={stats.comboProgress}
          applesEaten={stats.applesEaten}
          sector={stats.sector}
          targetApples={stats.targetApples}
          activeBuffs={stats.activeBuffs}
          gameMode={gameMode}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
        />
      )}

      {/* On-Screen Touch D-Pad for Mobile Players */}
      {gameState === 'PLAYING' && (
        <TouchControls onDirection={handleDirection} />
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnToTitle={handleReturnToTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          score={stats.score}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && gameOverSummary && (
        <GameOverModal
          summary={gameOverSummary}
          onPlayAgain={handleRestart}
          onReturnToTitle={handleReturnToTitle}
        />
      )}

      {/* Campaign Sector Victory Modal */}
      {gameState === 'SECTOR_VICTORY' && victorySummary && (
        <SectorClearModal
          sectorId={victorySummary.sectorId}
          nextSectorId={victorySummary.nextSectorId}
          score={stats.score}
          onNextSector={handleNextSector}
          onReturnToTitle={handleReturnToTitle}
        />
      )}
    </div>
  );
}
