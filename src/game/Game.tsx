import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Player, Level, Obstacle } from '../game/types';
import { LEVELS } from '../game/levels';
import { Play, RotateCcw, Home, Trophy, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRAVITY = 0.9;
const JUMP_FORCE = -13;
const FORWARD_SPEED = 9;
const PLAYER_SIZE = 40;
const GROUND_Y = 100; // Distance from bottom

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [shake, setShake] = useState(0);
  
  // Game state refs for the loop
  const playerRef = useRef<Player>({
    pos: { x: 100, y: 0 },
    vel: { x: FORWARD_SPEED, y: 0 },
    rotation: 0,
    size: PLAYER_SIZE,
    isDead: false,
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const lastSpawnXRef = useRef(400); // Start spawning after some distance
  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string}[]>([]);
  const cameraXRef = useRef(0);
  const isOnSurfaceRef = useRef(false);
  const requestRef = useRef<number>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color
      });
    }
  };

  const spawnObstacle = (x: number) => {
    const type = 'SPIKE';
    // Very rare chance for 3 spikes, otherwise 30% chance for 2 spikes
    const rand = Math.random();
    let count = 1;
    if (rand < 0.02) {
      count = 3; // Triple spike (2% chance)
    } else if (rand < 0.3) {
      count = 2; // Double spike (28% chance)
    }
    
    for (let i = 0; i < count; i++) {
      obstaclesRef.current.push({
        type,
        pos: { x: x + i * 40, y: 0 },
        width: 40,
        height: 40,
      });
    }
  };

  const resetPlayer = useCallback(() => {
    playerRef.current = {
      pos: { x: 100, y: 0 },
      vel: { x: FORWARD_SPEED, y: 0 },
      rotation: 0,
      size: PLAYER_SIZE,
      isDead: false,
    };
    cameraXRef.current = 0;
    obstaclesRef.current = [];
    lastSpawnXRef.current = 400;
    particlesRef.current = [];
    isOnSurfaceRef.current = false;
    setShake(0);
  }, []);

  const handleJump = useCallback(() => {
    if (gameState !== 'PLAYING' || playerRef.current.isDead) return;
    
    // Only jump if on ground or on a block
    if (isOnSurfaceRef.current) {
      playerRef.current.vel.y = JUMP_FORCE;
      // Jump particles
      const groundY = dimensionsRef.current.height - GROUND_Y;
      const playerY = groundY - playerRef.current.pos.y;
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: playerRef.current.pos.x,
          y: playerY,
          vx: -Math.random() * 2,
          vy: -Math.random() * 2,
          life: 0.5,
          color: 'rgba(255, 255, 255, 0.5)'
        });
      }
    }
  }, [gameState]);

  const resumeGame = useCallback(() => {
    setGameState('PLAYING');
  }, []);

  const pauseGame = useCallback(() => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      resumeGame();
    }
  }, [gameState, resumeGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Tab default behavior when in game or paused to avoid focus stealing
      if ((gameState === 'PLAYING' || gameState === 'PAUSED') && e.code === 'Tab') {
        e.preventDefault();
      }

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleJump();
      }
      
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Tab') {
        pauseGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump, pauseGame, gameState]);

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });

    if (playerRef.current.isDead) {
      setShake(s => Math.max(0, s - 0.5));
      return;
    }

    const player = playerRef.current;
    let isOnSurface = false;
    
    // Apply gravity
    player.vel.y += GRAVITY;
    player.pos.y -= player.vel.y;
    player.pos.x += player.vel.x;

    // Ground collision
    if (player.pos.y <= 0) {
      player.pos.y = 0;
      player.vel.y = 0;
      isOnSurface = true;
      // Snap rotation to 90 deg increments when on ground
      player.rotation = Math.round(player.rotation / 45) * 45; // Smoother snap
      if (player.rotation % 90 !== 0) {
        player.rotation = Math.round(player.rotation / 90) * 90;
      }
    } else {
      // Rotate while in air
      player.rotation += 5;
    }

    // Endless Spawning
    if (player.pos.x > lastSpawnXRef.current - 800) {
      // Random gap between spikes
      const gap = 300 + Math.random() * 400;
      lastSpawnXRef.current += gap;
      spawnObstacle(lastSpawnXRef.current);
    }

    // Clean up off-screen obstacles
    obstaclesRef.current = obstaclesRef.current.filter(obs => obs.pos.x > player.pos.x - 400);

    // Camera follow
    cameraXRef.current = player.pos.x - 200;

    // Obstacle collision
    const groundY = dimensionsRef.current.height - GROUND_Y;
    
    // Forgiving hitbox (shrink slightly)
    const padding = 4;
    const pX = player.pos.x + padding;
    const pY = groundY - player.pos.y - player.size + padding;
    const pW = player.size - padding * 2;
    const pH = player.size - padding * 2;

    for (const obs of obstaclesRef.current) {
      const obsX = obs.pos.x;
      const obsY = groundY - obs.pos.y - obs.height;
      
      // Check AABB collision
      if (
        pX < obsX + obs.width &&
        pX + pW > obsX &&
        pY < obsY + obs.height &&
        pY + pH > obsY
      ) {
        if (obs.type === 'BLOCK') {
          // Robust landing detection
          const playerBottom = pY + pH;
          const playerBottomPrev = groundY - (player.pos.y + player.vel.y);
          const obsTop = obsY;
          
          // If falling and was above the block, land on it
          if (player.vel.y >= 0 && playerBottomPrev <= obsTop + 15) {
            player.pos.y = obs.pos.y + obs.height;
            player.vel.y = 0;
            isOnSurface = true;
            player.rotation = Math.round(player.rotation / 90) * 90;
          } else {
            // Hit side or bottom
            player.isDead = true;
            setShake(15);
            createExplosion(player.pos.x + player.size/2, groundY - player.pos.y - player.size/2, '#ffff00');
            setTimeout(() => setGameState('GAMEOVER'), 800);
            break;
          }
        } else {
          // SPIKE collision
          player.isDead = true;
          setShake(20);
          createExplosion(player.pos.x + player.size/2, groundY - player.pos.y - player.size/2, '#ffff00');
          setTimeout(() => setGameState('GAMEOVER'), 800);
          break;
        }
      }
    }

    isOnSurfaceRef.current = isOnSurface;

    setScore(Math.floor(player.pos.x / 10));
  }, [gameState]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensionsRef.current;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    const groundY = height - GROUND_Y;
    const camX = cameraXRef.current;

    // Draw Background (Solid Color)
    ctx.fillStyle = '#3138bd';
    ctx.fillRect(0, 0, width, height);

    // Draw Ground
    ctx.fillStyle = '#070e84';
    ctx.fillRect(0, groundY, width, GROUND_Y);
    
    // White line at the top of the ground
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
      const x = obs.pos.x - camX;
      const y = groundY - obs.pos.y - obs.height;

      if (x + obs.width < 0 || x > width) return;

      if (obs.type === 'SPIKE') {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(x, y + obs.height);
        ctx.lineTo(x + obs.width / 2, y);
        ctx.lineTo(x + obs.width, y + obs.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x, y, obs.width, obs.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, obs.width, obs.height);
      }
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

      // Draw Player
    const player = playerRef.current;
    if (!player.isDead) {
      const px = player.pos.x - camX;
      const py = groundY - player.pos.y - player.size;

      ctx.save();
      ctx.translate(px + player.size / 2, py + player.size / 2);
      ctx.rotate((player.rotation * Math.PI) / 180);
      
      // Player Body (Vibrant Red)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
      
      // Dark Brown / Deep Orange Border
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 6;
      ctx.strokeRect(-player.size / 2, -player.size / 2, player.size, player.size);

      ctx.restore();
    }

    ctx.restore();

  }, [gameState, shake]);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    update();
    draw(ctx);
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        dimensionsRef.current = { width, height };
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const startGame = () => {
    resetPlayer();
    setGameState('PLAYING');
    setScore(0);
  };

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none"
      onMouseDown={handleJump}
      onTouchStart={handleJump}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

          {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-8 left-8 flex items-center gap-4">
          <button 
            onClick={pauseGame}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-sm transition-colors"
          >
            <Pause className="w-5 h-5 fill-current" />
          </button>
        </div>
      )}

      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <div className="absolute top-8 left-0 w-full flex flex-col items-center pointer-events-none">
          <div className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
            {score}
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {gameState === 'PAUSED' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md z-50"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-6xl font-black text-white mb-12 uppercase italic tracking-tighter">
                Paused
              </h2>
              
              <div className="flex flex-col gap-4 w-64">
                <button 
                  onClick={resumeGame}
                  className="flex items-center justify-center gap-3 py-6 bg-sky-500 text-white rounded-3xl font-black uppercase tracking-widest text-lg hover:bg-sky-400 transition-all shadow-[0_0_30px_rgba(14,165,233,0.4)] hover:scale-105 active:scale-95"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Resume
                </button>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setGameState('MENU')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-700 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Menu
                  </button>
                  <button 
                    onClick={startGame}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-12 text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] flex flex-col items-center gap-2">
                <span>Press <span className="text-white">P</span>, <span className="text-white">Tab</span>, or <span className="text-white">Esc</span> to resume</span>
              </div>
            </motion.div>
          </motion.div>
        )}
        {gameState === 'MENU' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.h1 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="text-7xl font-black text-white mb-2 tracking-tighter italic uppercase text-center"
            >
              GEOMETRY DASH <span className="text-[#00bcff]">RIPOFF</span>
            </motion.h1>
            <p className="text-slate-400 mb-12 font-medium tracking-wide uppercase text-sm">ENDLESS RUNNER</p>
            
            <button 
              onClick={startGame}
              className="group relative flex items-center justify-center w-24 h-24 bg-sky-500 rounded-full hover:bg-sky-400 transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(14,165,233,0.4)]"
            >
              <Play className="w-10 h-10 text-white fill-current ml-1" />
            </button>

            <div className="mt-16 flex gap-8">
              <div className="flex flex-col items-center">
                <Trophy className="w-6 h-6 text-yellow-400 mb-1" />
                <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Best</span>
                <span className="text-xl font-black text-white">{highScore}</span>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 p-12 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center max-w-sm w-full"
            >
              <h2 className="text-4xl font-black text-white mb-2 uppercase italic tracking-tighter">
                Crash!
              </h2>
              <div className="text-slate-400 text-sm uppercase font-bold tracking-widest mb-8">
                Try again
              </div>

              <div className="grid grid-cols-2 gap-8 w-full mb-10">
                <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Score</span>
                  <span className="text-2xl font-black text-white">{score}</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Best</span>
                  <span className="text-2xl font-black text-white">{highScore}</span>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setGameState('MENU')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Menu
                </button>
                <button 
                  onClick={startGame}
                  className="flex-[2] flex items-center justify-center gap-2 py-4 bg-sky-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-sky-400 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
};
