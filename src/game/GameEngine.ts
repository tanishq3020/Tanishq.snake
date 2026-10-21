import {
  Direction,
  FoodItem,
  FoodType,
  GameMode,
  GameState,
  Obstacle,
  Particle,
  FloatingText,
  Point,
  ActiveBuff,
} from '../types/game';
import { GRID_SIZE, THEMES, FOOD_COLORS, COMBO_WINDOW_MS, HITSTOP_MS } from './constants';
import { CAMPAIGN_SECTORS } from './sectors';
import { soundManager } from '../audio/soundManager';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onStatsUpdate: (stats: {
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
    elapsedSeconds: number;
  }) => void;
  onGameOver: (summary: {
    score: number;
    highScore: number;
    length: number;
    applesEaten: number;
    maxCombo: number;
    timeAliveSec: number;
    isNewHighScore: boolean;
    cause: string;
  }) => void;
  onSectorVictory: (sectorId: number, nextSectorId: number | null) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Game Lifecycle
  private state: GameState = 'TITLE';
  private mode: GameMode = 'CLASSIC';
  private themeId: string = 'CYBER_NEON';
  private sectorIndex: number = 0;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private hitstopUntil: number = 0;

  // Game Grid & Snake State
  private snake: Point[] = [];
  private prevSnake: Point[] = [];
  private direction: Direction = 'RIGHT';
  private inputBuffer: Direction[] = [];
  private score: number = 0;
  private highScore: number = 0;
  private applesEaten: number = 0;
  private maxCombo: number = 1;
  private currentCombo: number = 1;
  private comboExpiresAt: number = 0;
  private startTime: number = 0;
  private playTimeSec: number = 0;

  // Food and Hazards
  private foods: FoodItem[] = [];
  private obstacles: Obstacle[] = [];
  private nextPowerupSpawn: number = 0;

  // Active Buffs
  private activeBuffs: Map<FoodType, { remainingMs: number; totalMs: number }> = new Map();

  // Visual Effects & Camera (Object Pool for Particles maintaining steady 60fps)
  private readonly PARTICLE_POOL_SIZE = 180;
  private particlePool: Particle[] = [];
  private poolIndex: number = 0;
  private floatingTexts: FloatingText[] = [];
  private screenShake: number = 0;
  private headSquash: { x: number; y: number } = { x: 1, y: 1 };
  private headBiteAnimation: number = 0; // 0 to 1

  // Simulation Timing
  private tickAccumulator: number = 0;
  private baseSpeedMs: number = 110;
  private hasWrapWalls: boolean = true;
  private currentCellSize: number = 20;
  private offsetX: number = 0;
  private offsetY: number = 0;

  // Attract AI wanderer for Title screen
  private aiNextTurn: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.callbacks = callbacks;

    this.initParticlePool();
    this.loadHighScore();
    this.setupWindowListeners();
    this.resizeCanvas();
    this.initTitleAttractMode();
    this.startLoop();
  }

  private initParticlePool() {
    this.particlePool = new Array(this.PARTICLE_POOL_SIZE);
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      this.particlePool[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#ffffff',
        alpha: 0,
        shape: 'circle',
        drag: 0.92,
        rotation: 0,
        vRot: 0,
      };
    }
  }

  /**
   * Retrieves an available particle from the pre-allocated pool without allocating memory.
   */
  private obtainPooledParticle(): Particle {
    const startIdx = this.poolIndex;
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      const idx = (startIdx + i) % this.PARTICLE_POOL_SIZE;
      if (!this.particlePool[idx].active) {
        this.poolIndex = (idx + 1) % this.PARTICLE_POOL_SIZE;
        return this.particlePool[idx];
      }
    }
    // If pool is fully active, recycle the oldest particle at current poolIndex
    const recycled = this.particlePool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.PARTICLE_POOL_SIZE;
    return recycled;
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('blur', this.handleBlur);
  }

  private loadHighScore() {
    const saved = localStorage.getItem(`snake_high_${this.mode}`);
    this.highScore = saved ? parseInt(saved, 10) : 0;
  }

  private saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(`snake_high_${this.mode}`, String(this.highScore));
    }
  }

  private handleResize = () => {
    this.resizeCanvas();
  };

  private handleBlur = () => {
    if (this.state === 'PLAYING') {
      this.pauseGame();
    }
    this.inputBuffer = [];
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default scrolling for arrows and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (this.state === 'PLAYING') {
        this.pauseGame();
        return;
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
        return;
      }
    }

    if (this.state === 'TITLE' || this.state === 'GAME_OVER' || this.state === 'SECTOR_VICTORY') {
      if (e.key === 'Enter' || e.key === ' ') {
        this.startNewGame(this.mode, this.sectorIndex);
        return;
      }
    }

    if (this.state !== 'PLAYING') return;

    let requestedDir: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        requestedDir = 'UP';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        requestedDir = 'DOWN';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        requestedDir = 'LEFT';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        requestedDir = 'RIGHT';
        break;
    }

    if (requestedDir) {
      this.queueDirection(requestedDir);
    }
  };

  public queueDirection(newDir: Direction) {
    if (this.state !== 'PLAYING') return;

    // Look at last queued or current direction
    const lastDir = this.inputBuffer.length > 0 ? this.inputBuffer[this.inputBuffer.length - 1] : this.direction;

    // Disallow 180-degree immediate reversal into neck
    if (
      (newDir === 'UP' && lastDir === 'DOWN') ||
      (newDir === 'DOWN' && lastDir === 'UP') ||
      (newDir === 'LEFT' && lastDir === 'RIGHT') ||
      (newDir === 'RIGHT' && lastDir === 'LEFT')
    ) {
      return;
    }

    // Limit buffer length to 2 steps for crisp responsive cornering
    if (this.inputBuffer.length < 2 && lastDir !== newDir) {
      this.inputBuffer.push(newDir);
    }
  }

  private setupWindowListeners() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('blur', this.handleBlur);
  }

  public resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    // Compute square grid centered with margins for HUD
    const availableSize = Math.min(width - 32, height - 120);
    this.currentCellSize = Math.max(12, Math.floor(availableSize / GRID_SIZE));
    const boardPixelSize = this.currentCellSize * GRID_SIZE;

    this.offsetX = Math.floor((width - boardPixelSize) / 2);
    this.offsetY = Math.floor((height - boardPixelSize) / 2) + 20; // Slightly lower for top HUD
  }

  public setTheme(themeId: string) {
    if (THEMES[themeId]) {
      this.themeId = themeId;
    }
  }

  public setMode(mode: GameMode) {
    this.mode = mode;
    this.loadHighScore();
  }

  public startNewGame(mode: GameMode = 'CLASSIC', sectorIndex: number = 0) {
    this.mode = mode;
    this.sectorIndex = sectorIndex;
    this.loadHighScore();

    this.snake = [
      { x: 8, y: 13 },
      { x: 7, y: 13 },
      { x: 6, y: 13 },
      { x: 5, y: 13 },
    ];
    this.prevSnake = JSON.parse(JSON.stringify(this.snake));
    this.direction = 'RIGHT';
    this.inputBuffer = [];

    this.score = 0;
    this.applesEaten = 0;
    this.currentCombo = 1;
    this.maxCombo = 1;
    this.comboExpiresAt = 0;
    this.startTime = performance.now();
    this.playTimeSec = 0;
    this.activeBuffs.clear();
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      this.particlePool[i].active = false;
    }
    this.poolIndex = 0;
    this.floatingTexts = [];
    this.screenShake = 0;

    // Sector setup
    if (this.mode === 'CAMPAIGN') {
      const sectorDef = CAMPAIGN_SECTORS[this.sectorIndex] || CAMPAIGN_SECTORS[0];
      this.obstacles = JSON.parse(JSON.stringify(sectorDef.obstacles));
      this.baseSpeedMs = sectorDef.baseSpeedMs;
      this.hasWrapWalls = sectorDef.hasWrapWalls;
    } else if (this.mode === 'SPEED_BLITZ') {
      this.obstacles = [];
      this.baseSpeedMs = 75;
      this.hasWrapWalls = true;
    } else if (this.mode === 'ZEN') {
      this.obstacles = [];
      this.baseSpeedMs = 120;
      this.hasWrapWalls = true;
    } else {
      // CLASSIC
      this.obstacles = [];
      this.baseSpeedMs = 110;
      this.hasWrapWalls = false;
    }

    this.foods = [];
    this.spawnFood('APPLE');
    if (this.mode !== 'ZEN') {
      this.nextPowerupSpawn = performance.now() + 8000;
    }

    this.state = 'PLAYING';
    this.callbacks.onStateChange(this.state);
    this.notifyStats();
    soundManager.playUiClick();
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.callbacks.onStateChange(this.state);
      soundManager.playUiClick();
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.callbacks.onStateChange(this.state);
      soundManager.playUiClick();
    }
  }

  public returnToTitle() {
    this.state = 'TITLE';
    this.initTitleAttractMode();
    this.callbacks.onStateChange(this.state);
    soundManager.playUiClick();
  }

  private initTitleAttractMode() {
    this.snake = [
      { x: 12, y: 13 },
      { x: 11, y: 13 },
      { x: 10, y: 13 },
      { x: 9, y: 13 },
      { x: 8, y: 13 },
      { x: 7, y: 13 },
    ];
    this.direction = 'RIGHT';
    this.inputBuffer = [];
    this.obstacles = [];
    this.hasWrapWalls = true;
    this.foods = [
      {
        id: 'attract-1',
        x: 18,
        y: 13,
        type: 'GOLDEN_CHIP',
        spawnTime: performance.now(),
        value: 50,
        color: FOOD_COLORS.GOLDEN_CHIP.main,
        glowColor: FOOD_COLORS.GOLDEN_CHIP.glow,
      },
      {
        id: 'attract-2',
        x: 6,
        y: 8,
        type: 'APPLE',
        spawnTime: performance.now(),
        value: 10,
        color: FOOD_COLORS.APPLE.main,
        glowColor: FOOD_COLORS.APPLE.glow,
      },
    ];
  }

  private getEffectiveTickSpeed(): number {
    let speed = this.baseSpeedMs;

    // Progressive speed up based on score in classic / campaign
    if (this.mode === 'CLASSIC' || this.mode === 'CAMPAIGN') {
      const acceleration = Math.min(this.applesEaten * 1.5, 45);
      speed = Math.max(speed - acceleration, 55);
    }

    if (this.activeBuffs.has('SPEED_SURGE')) {
      speed = Math.floor(speed * 0.72);
    }
    if (this.activeBuffs.has('SLOW_MO')) {
      speed = Math.floor(speed * 1.45);
    }

    return speed;
  }

  private spawnFood(type: FoodType = 'APPLE') {
    // Find unoccupied cell
    const occupied = new Set<string>();
    for (const seg of this.snake) {
      occupied.add(`${seg.x},${seg.y}`);
    }
    for (const obs of this.obstacles) {
      occupied.add(`${obs.x},${obs.y}`);
    }
    for (const f of this.foods) {
      occupied.add(`${f.x},${f.y}`);
    }

    const available: Point[] = [];
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      for (let y = 1; y < GRID_SIZE - 1; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return;
    const choice = available[Math.floor(Math.random() * available.length)];

    let duration: number | undefined;
    let value = 10;
    if (type === 'GOLDEN_CHIP') {
      duration = 8000;
      value = 50;
    } else if (type === 'GHOST_CHIP') {
      duration = 10000;
      value = 25;
    } else if (type === 'SPEED_SURGE' || type === 'SLOW_MO' || type === 'MAGNET') {
      duration = 9000;
      value = 30;
    }

    const palette = FOOD_COLORS[type] || FOOD_COLORS.APPLE;

    this.foods.push({
      id: `${type}-${Date.now()}-${Math.random()}`,
      x: choice.x,
      y: choice.y,
      type,
      spawnTime: performance.now(),
      duration,
      value,
      color: palette.main,
      glowColor: palette.glow,
    });
  }

  private startLoop() {
    this.lastFrameTime = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;
      const dt = Math.min(rawDt, 0.05); // Clamped delta time

      // Handle hitstop freeze frame
      if (time >= this.hitstopUntil) {
        this.update(dt, time);
      }

      this.render(time);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number, now: number) {
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake * Math.pow(0.85, dt * 60));
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt * 1000;
      ft.y -= dt * 28;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update pooled particles (in-place, zero GC allocation for 60fps)
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      const p = this.particlePool[i];
      if (!p.active) continue;

      p.life += dt * 1000;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.drag ?? 0.92;
      p.vx *= Math.pow(drag, dt * 60);
      p.vy *= Math.pow(drag, dt * 60);
      if (p.vRot) {
        p.rotation = (p.rotation || 0) + p.vRot * dt;
      }
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }

    // Squash-and-stretch relaxation
    this.headSquash.x += (1 - this.headSquash.x) * Math.min(dt * 12, 1);
    this.headSquash.y += (1 - this.headSquash.y) * Math.min(dt * 12, 1);
    this.headBiteAnimation = Math.max(0, this.headBiteAnimation - dt * 6);

    // Title screen autonomous attract wandering
    if (this.state === 'TITLE') {
      this.updateTitleAttract(dt, now);
      return;
    }

    if (this.state !== 'PLAYING') return;

    this.playTimeSec = Math.floor((now - this.startTime) / 1000);

    // Combo decay
    if (this.currentCombo > 1 && now > this.comboExpiresAt) {
      this.currentCombo = 1;
      this.notifyStats();
    }

    // Active buffs countdown
    const buffsToRemove: FoodType[] = [];
    this.activeBuffs.forEach((buff, type) => {
      buff.remainingMs -= dt * 1000;
      if (buff.remainingMs <= 0) {
        buffsToRemove.push(type);
      }
    });
    for (const type of buffsToRemove) {
      this.activeBuffs.delete(type);
      this.addFloatingText(`${type.replace('_', ' ')} EXPIRED`, this.snake[0].x, this.snake[0].y, '#94a3b8');
      this.notifyStats();
    }

    // Expire fleeting food items
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      if (f.duration && now - f.spawnTime > f.duration) {
        this.spawnParticleBurst(f.x, f.y, f.color, 8);
        this.foods.splice(i, 1);
      }
    }

    // Ensure at least one apple exists
    if (!this.foods.some((f) => f.type === 'APPLE')) {
      this.spawnFood('APPLE');
    }

    // Dynamic bonus food spawn
    if (this.mode !== 'ZEN' && now > this.nextPowerupSpawn) {
      const bonusTypes: FoodType[] = ['GOLDEN_CHIP', 'GHOST_CHIP', 'SPEED_SURGE', 'SLOW_MO', 'MAGNET'];
      const chosen = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
      this.spawnFood(chosen);
      this.nextPowerupSpawn = now + 12000 + Math.random() * 8000;
    }

    // Magnet buff effect
    if (this.activeBuffs.has('MAGNET')) {
      const head = this.snake[0];
      for (const food of this.foods) {
        const dist = Math.abs(food.x - head.x) + Math.abs(food.y - head.y);
        if (dist <= 4 && dist > 0 && Math.random() < 0.15) {
          const dx = Math.sign(head.x - food.x);
          const dy = Math.sign(head.y - food.y);
          if (dx !== 0 && !this.isBlocked(food.x + dx, food.y)) {
            food.x += dx;
          } else if (dy !== 0 && !this.isBlocked(food.x, food.y + dy)) {
            food.y += dy;
          }
        }
      }
    }

    // Simulation tick accumulator
    const stepDurationMs = this.getEffectiveTickSpeed();
    this.tickAccumulator += dt * 1000;

    while (this.tickAccumulator >= stepDurationMs) {
      this.tickAccumulator -= stepDurationMs;
      this.stepSimulation();
      if (this.state !== 'PLAYING') break;
    }

    this.notifyStats();
  }

  private isBlocked(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    return this.obstacles.some((o) => o.type === 'WALL' && o.x === x && o.y === y);
  }

  private updateTitleAttract(dt: number, now: number) {
    this.tickAccumulator += dt * 1000;
    if (this.tickAccumulator >= 120) {
      this.tickAccumulator = 0;

      // Smart pathfinding toward nearest food
      const head = this.snake[0];
      const target = this.foods[0] || { x: 13, y: 13 };

      const dx = target.x - head.x;
      const dy = target.y - head.y;

      const candidates: Direction[] = [];
      if (Math.abs(dx) > Math.abs(dy)) {
        candidates.push(dx > 0 ? 'RIGHT' : 'LEFT');
        candidates.push(dy > 0 ? 'DOWN' : 'UP');
        candidates.push(dy > 0 ? 'UP' : 'DOWN');
        candidates.push(dx > 0 ? 'LEFT' : 'RIGHT');
      } else {
        candidates.push(dy > 0 ? 'DOWN' : 'UP');
        candidates.push(dx > 0 ? 'RIGHT' : 'LEFT');
        candidates.push(dx > 0 ? 'LEFT' : 'RIGHT');
        candidates.push(dy > 0 ? 'UP' : 'DOWN');
      }

      for (const cand of candidates) {
        if (
          (cand === 'UP' && this.direction === 'DOWN') ||
          (cand === 'DOWN' && this.direction === 'UP') ||
          (cand === 'LEFT' && this.direction === 'RIGHT') ||
          (cand === 'RIGHT' && this.direction === 'LEFT')
        ) {
          continue;
        }

        const nextPt = this.getNextPoint(head, cand, true);
        const willHitSelf = this.snake.slice(0, -1).some((s) => s.x === nextPt.x && s.y === nextPt.y);
        if (!willHitSelf) {
          this.direction = cand;
          break;
        }
      }

      this.stepSimulation(true);
    }
  }

  private getNextPoint(head: Point, dir: Direction, wrap: boolean): Point {
    let nextX = head.x;
    let nextY = head.y;

    if (dir === 'UP') nextY--;
    else if (dir === 'DOWN') nextY++;
    else if (dir === 'LEFT') nextX--;
    else if (dir === 'RIGHT') nextX++;

    if (wrap) {
      if (nextX < 0) nextX = GRID_SIZE - 1;
      else if (nextX >= GRID_SIZE) nextX = 0;
      if (nextY < 0) nextY = GRID_SIZE - 1;
      else if (nextY >= GRID_SIZE) nextY = 0;
    }

    return { x: nextX, y: nextY };
  }

  private stepSimulation(isAttract: boolean = false) {
    if (this.inputBuffer.length > 0) {
      this.direction = this.inputBuffer.shift()!;
      soundManager.playTurn();
    }

    const head = this.snake[0];
    let nextHead = this.getNextPoint(head, this.direction, this.hasWrapWalls);

    // Wall collision check
    if (!this.hasWrapWalls) {
      if (nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE) {
        if (!this.activeBuffs.has('GHOST_CHIP') && !isAttract) {
          this.handleDeath('WALL_COLLISION');
          return;
        } else {
          // Wrap if ghost chip active
          nextHead = this.getNextPoint(head, this.direction, true);
        }
      }
    }

    // Portal check
    const portal = this.obstacles.find((o) => o.type === 'PORTAL' && o.x === nextHead.x && o.y === nextHead.y);
    if (portal && portal.portalTarget) {
      this.spawnParticleBurst(nextHead.x, nextHead.y, '#38bdf8', 16);
      nextHead = { x: portal.portalTarget.x, y: portal.portalTarget.y };
      this.spawnParticleBurst(nextHead.x, nextHead.y, '#38bdf8', 16);
      soundManager.playPortal();
      this.addFloatingText('WARP!', nextHead.x, nextHead.y, '#38bdf8');
    }

    // Wall obstacle check
    const hitWall = this.obstacles.some((o) => o.type === 'WALL' && o.x === nextHead.x && o.y === nextHead.y);
    if (hitWall) {
      if (!this.activeBuffs.has('GHOST_CHIP') && !isAttract) {
        this.handleDeath('OBSTACLE_COLLISION');
        return;
      } else {
        this.addFloatingText('PHASED', nextHead.x, nextHead.y, '#c084fc');
      }
    }

    // Self collision check
    const isGhost = this.activeBuffs.has('GHOST_CHIP');
    const hitSelf = this.snake.slice(0, -1).some((s) => s.x === nextHead.x && s.y === nextHead.y);
    if (hitSelf && !isGhost && !isAttract) {
      if (this.mode !== 'ZEN') {
        this.handleDeath('SELF_COLLISION');
        return;
      }
    }

    // Squash & stretch on turn
    if (this.direction === 'LEFT' || this.direction === 'RIGHT') {
      this.headSquash = { x: 1.25, y: 0.8 };
    } else {
      this.headSquash = { x: 0.8, y: 1.25 };
    }

    // Advance snake body
    this.prevSnake = JSON.parse(JSON.stringify(this.snake));
    this.snake.unshift(nextHead);

    // Food check
    const eatenIndex = this.foods.findIndex((f) => f.x === nextHead.x && f.y === nextHead.y);

    if (eatenIndex >= 0) {
      const food = this.foods[eatenIndex];
      this.foods.splice(eatenIndex, 1);
      this.handleFoodEaten(food, nextHead, isAttract);
    } else {
      this.snake.pop(); // Remove tail
    }
  }

  private handleFoodEaten(food: FoodItem, pos: Point, isAttract: boolean) {
    this.headBiteAnimation = 1.0;
    this.applesEaten++;

    if (isAttract) {
      this.spawnFood('APPLE');
      return;
    }

    // Combo system
    const now = performance.now();
    if (now <= this.comboExpiresAt) {
      this.currentCombo = Math.min(this.currentCombo + 1, 8);
    } else {
      this.currentCombo = 1;
    }
    this.comboExpiresAt = now + COMBO_WINDOW_MS;
    if (this.currentCombo > this.maxCombo) {
      this.maxCombo = this.currentCombo;
    }

    // Score calculation
    const points = food.value * this.currentCombo;
    this.score += points;
    this.saveHighScore();

    // Floating score text
    const comboLabel = this.currentCombo > 1 ? ` (x${this.currentCombo})` : '';
    this.addFloatingText(`+${points}${comboLabel}`, pos.x, pos.y, food.color);

    // Trigger high-performance particle explosion effect from object pool (maintains 60fps)
    this.triggerAppleExplosion(pos.x, pos.y, food.color, this.currentCombo > 1, this.currentCombo);

    if (food.type === 'GOLDEN_CHIP') {
      this.screenShake = 6;
      this.hitstopUntil = performance.now() + 45;
      soundManager.playGoldenChip();
    } else if (food.type === 'APPLE') {
      soundManager.playBite(this.currentCombo);
    } else {
      // Power up
      this.activeBuffs.set(food.type, {
        remainingMs: food.duration || 8000,
        totalMs: food.duration || 8000,
      });
      soundManager.playPowerUp();
      this.screenShake = 4;
      this.addFloatingText(`${food.type.replace('_', ' ')}!`, pos.x, pos.y - 1, food.color);
    }

    // Campaign victory check
    if (this.mode === 'CAMPAIGN') {
      const currentDef = CAMPAIGN_SECTORS[this.sectorIndex];
      if (currentDef && this.applesEaten >= currentDef.targetApples) {
        this.handleSectorVictory();
        return;
      }
    }

    // Spawn new regular food if none remain
    if (!this.foods.some((f) => f.type === 'APPLE')) {
      this.spawnFood('APPLE');
    }
  }

  private handleSectorVictory() {
    this.state = 'SECTOR_VICTORY';
    soundManager.playLevelClear();
    this.callbacks.onStateChange(this.state);
    const nextSector = this.sectorIndex + 1 < CAMPAIGN_SECTORS.length ? this.sectorIndex + 1 : null;
    this.callbacks.onSectorVictory(this.sectorIndex + 1, nextSector);
  }

  private handleDeath(cause: string) {
    this.state = 'GAME_OVER';
    this.screenShake = 16;
    this.hitstopUntil = performance.now() + HITSTOP_MS;
    soundManager.playCrash();
    soundManager.playGameOver();

    // Explode head into fragments
    const head = this.snake[0];
    this.spawnParticleBurst(head.x, head.y, '#ef4444', 36);

    const isNewHigh = this.score > 0 && this.score >= this.highScore;
    this.saveHighScore();

    this.callbacks.onStateChange(this.state);
    this.callbacks.onGameOver({
      score: this.score,
      highScore: this.highScore,
      length: this.snake.length,
      applesEaten: this.applesEaten,
      maxCombo: this.maxCombo,
      timeAliveSec: this.playTimeSec,
      isNewHighScore: isNewHigh,
      cause,
    });
  }

  /**
   * Triggers a juicy particle explosion effect when consuming an apple or power-up.
   * Utilizes a small fixed object pool to guarantee zero runtime allocations and solid 60fps.
   */
  public triggerAppleExplosion(
    gridX: number,
    gridY: number,
    color: string = '#ef4444',
    isCombo: boolean = false,
    comboMultiplier: number = 1
  ) {
    const px = this.offsetX + gridX * this.currentCellSize + this.currentCellSize / 2;
    const py = this.offsetY + gridY * this.currentCellSize + this.currentCellSize / 2;

    const radialCount = isCombo ? 20 : 14;

    // 1. High-velocity radial spark burst
    for (let i = 0; i < radialCount; i++) {
      const p = this.obtainPooledParticle();
      const angle = (Math.PI * 2 * i) / radialCount + (Math.random() - 0.5) * 0.35;
      const speed = 100 + Math.random() * 150 + (isCombo ? 40 : 0);

      p.active = true;
      p.x = px;
      p.y = py;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 320 + Math.random() * 220;
      p.size = 2.4 + Math.random() * 2.8;
      p.color = i % 3 === 0 ? '#ffffff' : color;
      p.alpha = 1;
      p.shape = i % 2 === 0 ? 'spark' : 'circle';
      p.drag = 0.90;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 12;
    }

    // 2. Fruit flesh fragments (drifting chunks)
    const chunkCount = isCombo ? 6 : 4;
    for (let i = 0; i < chunkCount; i++) {
      const p = this.obtainPooledParticle();
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 65;

      p.active = true;
      p.x = px + (Math.random() - 0.5) * 6;
      p.y = py + (Math.random() - 0.5) * 6;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 12; // upward pop
      p.life = 0;
      p.maxLife = 450 + Math.random() * 250;
      p.size = 3.2 + Math.random() * 2.5;
      p.color = color;
      p.alpha = 1;
      p.shape = 'square';
      p.drag = 0.93;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 8;
    }

    // 3. Shockwave ring expansion
    const ring = this.obtainPooledParticle();
    ring.active = true;
    ring.x = px;
    ring.y = py;
    ring.vx = 0;
    ring.vy = 0;
    ring.life = 0;
    ring.maxLife = 220;
    ring.size = 3;
    ring.color = color;
    ring.alpha = 0.85;
    ring.shape = 'ring';
    ring.drag = 1;
    ring.rotation = 0;
    ring.vRot = 0;

    // 4. Bonus golden glints on combo
    if (isCombo && comboMultiplier > 1) {
      for (let i = 0; i < 4; i++) {
        const glint = this.obtainPooledParticle();
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 90;

        glint.active = true;
        glint.x = px;
        glint.y = py;
        glint.vx = Math.cos(angle) * speed;
        glint.vy = Math.sin(angle) * speed;
        glint.life = 0;
        glint.maxLife = 380 + Math.random() * 180;
        glint.size = 2;
        glint.color = '#fbbf24';
        glint.alpha = 1;
        glint.shape = 'spark';
        glint.drag = 0.91;
        glint.rotation = Math.random() * Math.PI * 2;
        glint.vRot = (Math.random() - 0.5) * 15;
      }
    }
  }

  private spawnParticleBurst(gridX: number, gridY: number, color: string, count: number) {
    const px = this.offsetX + gridX * this.currentCellSize + this.currentCellSize / 2;
    const py = this.offsetY + gridY * this.currentCellSize + this.currentCellSize / 2;

    for (let i = 0; i < count; i++) {
      const p = this.obtainPooledParticle();
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 140;

      p.active = true;
      p.x = px;
      p.y = py;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 400 + Math.random() * 300;
      p.size = 2 + Math.random() * 3.5;
      p.color = color;
      p.alpha = 1;
      p.shape = Math.random() > 0.4 ? 'circle' : 'spark';
      p.drag = 0.92;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 6;
    }
  }

  private addFloatingText(text: string, gridX: number, gridY: number, color: string) {
    const px = this.offsetX + gridX * this.currentCellSize + this.currentCellSize / 2;
    const py = this.offsetY + gridY * this.currentCellSize;

    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x: px,
      y: py,
      life: 0,
      maxLife: 900,
      color,
      scale: 1,
    });
  }

  private notifyStats() {
    const now = performance.now();
    const comboProgress = this.currentCombo > 1 ? Math.max(0, (this.comboExpiresAt - now) / COMBO_WINDOW_MS) : 0;

    const currentDef = this.mode === 'CAMPAIGN' ? CAMPAIGN_SECTORS[this.sectorIndex] : null;

    const activeBuffsList: ActiveBuff[] = [];
    this.activeBuffs.forEach((val, type) => {
      activeBuffsList.push({
        type,
        remainingMs: Math.max(0, val.remainingMs),
        totalMs: val.totalMs,
      });
    });

    this.callbacks.onStatsUpdate({
      score: this.score,
      highScore: this.highScore,
      length: this.snake.length,
      combo: this.currentCombo,
      comboProgress,
      applesEaten: this.applesEaten,
      sector: this.sectorIndex + 1,
      targetApples: currentDef ? currentDef.targetApples : 0,
      activeBuffs: activeBuffsList,
      gameMode: this.mode,
      elapsedSeconds: this.playTimeSec,
    });
  }

  // ==========================================
  // RENDERING ENGINE
  // ==========================================
  private render(now: number) {
    const ctx = this.ctx;
    const theme = THEMES[this.themeId] || THEMES.CYBER_NEON;
    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Deep Dark Canvas Background
    ctx.fillStyle = theme.bgDark;
    ctx.fillRect(0, 0, width, height);

    // Subtle Radial Vignette
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.1,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Area
    this.renderGrid(ctx, theme);

    // Draw Obstacles / Portals
    this.renderObstacles(ctx, now);

    // Draw Foods with Pulsing Glows
    this.renderFoods(ctx, now);

    // Draw Snake with Fluid Body & Glow
    this.renderSnake(ctx, theme, now);

    // Draw Particles
    this.renderParticles(ctx);

    // Draw Floating Text
    this.renderFloatingTexts(ctx);

    ctx.restore();
  }

  private renderGrid(ctx: CanvasRenderingContext2D, theme: (typeof THEMES)[string]) {
    const cs = this.currentCellSize;
    const boardPx = GRID_SIZE * cs;
    const ox = this.offsetX;
    const oy = this.offsetY;

    // Grid Container Frame
    ctx.fillStyle = 'rgba(10, 16, 28, 0.65)';
    ctx.fillRect(ox, oy, boardPx, boardPx);

    // Grid Lines
    ctx.strokeStyle = theme.gridLineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.moveTo(ox + i * cs, oy);
      ctx.lineTo(ox + i * cs, oy + boardPx);
      ctx.moveTo(ox, oy + i * cs);
      ctx.lineTo(ox + boardPx, oy + i * cs);
    }
    ctx.stroke();

    // Outer Border
    ctx.strokeStyle = this.hasWrapWalls ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, boardPx, boardPx);

    // Corner Accents
    const cornerSize = 12;
    ctx.strokeStyle = theme.accentGlow;
    ctx.lineWidth = 3;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(ox, oy + cornerSize);
    ctx.lineTo(ox, oy);
    ctx.lineTo(ox + cornerSize, oy);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(ox + boardPx - cornerSize, oy);
    ctx.lineTo(ox + boardPx, oy);
    ctx.lineTo(ox + boardPx, oy + cornerSize);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(ox, oy + boardPx - cornerSize);
    ctx.lineTo(ox, oy + boardPx);
    ctx.lineTo(ox + cornerSize, oy + boardPx);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(ox + boardPx - cornerSize, oy + boardPx);
    ctx.lineTo(ox + boardPx, oy + boardPx);
    ctx.lineTo(ox + boardPx, oy + boardPx - cornerSize);
    ctx.stroke();
  }

  private renderObstacles(ctx: CanvasRenderingContext2D, now: number) {
    const cs = this.currentCellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    for (const obs of this.obstacles) {
      const px = ox + obs.x * cs;
      const py = oy + obs.y * cs;

      if (obs.type === 'WALL') {
        // Sci-fi metallic barrier node
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);

        // Core hazard stripes
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fillRect(px + cs * 0.35, py + cs * 0.35, cs * 0.3, cs * 0.3);
      } else if (obs.type === 'PORTAL') {
        // Swirling warp portal
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.006 + (obs.portalId || 0));
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10 + pulse * 6;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);

        ctx.fillStyle = `rgba(56, 189, 248, ${0.25 + pulse * 0.35})`;
        ctx.beginPath();
        ctx.arc(px + cs / 2, py + cs / 2, (cs / 2) * (0.6 + pulse * 0.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderFoods(ctx: CanvasRenderingContext2D, now: number) {
    const cs = this.currentCellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    for (const food of this.foods) {
      const px = ox + food.x * cs;
      const py = oy + food.y * cs;
      const pulse = 0.6 + 0.4 * Math.sin((now - food.spawnTime) * 0.008);

      ctx.save();
      ctx.shadowColor = food.glowColor;
      ctx.shadowBlur = 12 * pulse;

      const centerX = px + cs / 2;
      const centerY = py + cs / 2;
      const radius = (cs / 2 - 2) * (0.85 + pulse * 0.15);

      if (food.type === 'APPLE') {
        // Ruby core apple
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Stem highlight
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(centerX - 1, centerY - radius - 2, 2, 4);
      } else if (food.type === 'GOLDEN_CHIP') {
        // Rotating Diamond Star
        ctx.fillStyle = food.color;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((now - food.spawnTime) * 0.003);
        ctx.beginPath();
        ctx.rect(-radius * 0.8, -radius * 0.8, radius * 1.6, radius * 1.6);
        ctx.fill();
        ctx.restore();
      } else {
        // Hexagonal / Tech Power Core
        ctx.fillStyle = food.color;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (Math.PI / 3) * a;
          const hx = centerX + Math.cos(angle) * radius;
          const hy = centerY + Math.sin(angle) * radius;
          if (a === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderSnake(ctx: CanvasRenderingContext2D, theme: (typeof THEMES)[string], now: number) {
    if (this.snake.length === 0) return;

    const cs = this.currentCellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;
    const isGhost = this.activeBuffs.has('GHOST_CHIP');
    const isSpeed = this.activeBuffs.has('SPEED_SURGE');

    // Draw Snake Body Segments
    ctx.save();
    if (isGhost) {
      ctx.globalAlpha = 0.55;
    }

    // Connect body segments
    for (let i = this.snake.length - 1; i >= 1; i--) {
      const seg = this.snake[i];
      const px = ox + seg.x * cs;
      const py = oy + seg.y * cs;

      // Ratio from tail (0) to head (1)
      const ratio = i / this.snake.length;
      const segmentRadius = Math.max(3, (cs / 2 - 2) * (0.65 + (1 - ratio) * 0.35));

      // Segment color gradient
      ctx.fillStyle = i % 2 === 0 ? theme.bodyColor : theme.bodyAccent;

      if (isSpeed) {
        ctx.fillStyle = '#38bdf8';
      }

      ctx.beginPath();
      ctx.arc(px + cs / 2, py + cs / 2, segmentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Connector line to next segment if adjacent (not wrapping)
      const nextSeg = this.snake[i - 1];
      const dist = Math.abs(seg.x - nextSeg.x) + Math.abs(seg.y - nextSeg.y);
      if (dist === 1) {
        const nextPx = ox + nextSeg.x * cs;
        const nextPy = oy + nextSeg.y * cs;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = segmentRadius * 1.6;
        ctx.beginPath();
        ctx.moveTo(px + cs / 2, py + cs / 2);
        ctx.lineTo(nextPx + cs / 2, nextPy + cs / 2);
        ctx.stroke();
      }
    }

    // Draw Head
    const head = this.snake[0];
    const hx = ox + head.x * cs + cs / 2;
    const hy = oy + head.y * cs + cs / 2;

    ctx.save();
    ctx.translate(hx, hy);

    // Head orientation
    let angle = 0;
    if (this.direction === 'RIGHT') angle = 0;
    else if (this.direction === 'DOWN') angle = Math.PI / 2;
    else if (this.direction === 'LEFT') angle = Math.PI;
    else if (this.direction === 'UP') angle = -Math.PI / 2;

    ctx.rotate(angle);
    ctx.scale(this.headSquash.x, this.headSquash.y);

    // Head Glow
    ctx.shadowColor = theme.accentGlow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = theme.headColor;

    // Rounded aerodynamic head shape
    const hr = cs / 2 - 1;
    ctx.beginPath();
    ctx.arc(0, 0, hr, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-hr * 0.6, hr);
    ctx.lineTo(-hr * 0.6, -hr);
    ctx.closePath();
    ctx.fill();

    // Snake Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.eyeColor;
    const eyeOffsetX = hr * 0.2;
    const eyeOffsetY = hr * 0.5;

    // Top Eye
    ctx.beginPath();
    ctx.arc(eyeOffsetX, -eyeOffsetY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bottom Eye
    ctx.beginPath();
    ctx.arc(eyeOffsetX, eyeOffsetY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#060913';
    ctx.beginPath();
    ctx.arc(eyeOffsetX + 1, -eyeOffsetY, 1.2, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 1, eyeOffsetY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Flickering Tongue when close to food
    const nearestFood = this.foods[0];
    const isNearFood =
      nearestFood && Math.abs(nearestFood.x - head.x) + Math.abs(nearestFood.y - head.y) <= 3;
    if (isNearFood || Math.sin(now * 0.015) > 0.7) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hr, 0);
      ctx.lineTo(hr + 7, 0);
      ctx.lineTo(hr + 10, -3);
      ctx.moveTo(hr + 7, 0);
      ctx.lineTo(hr + 10, 3);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      const p = this.particlePool[i];
      if (!p.active || p.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'ring') {
        const progress = p.life / p.maxLife;
        const currentRadius = p.size + progress * 24;
        ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'spark') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
      } else if (p.shape === 'square') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace';

    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }
}
