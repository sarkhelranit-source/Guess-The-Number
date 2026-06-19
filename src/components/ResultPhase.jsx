import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { playVictory, playClick, playTick } from '../services/soundManager';

// ── Deterministic gradient avatar (same as Lobby) ───
function nameToGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 60 + (hash % 60)) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 75%, 55%), hsl(${h2}, 80%, 45%))`;
}

export default function ResultPhase({ winner, myNickname, isHost, onPlayAgain, onBackToRoom, target, gameMode }) {
  const isWinner = winner === myNickname;
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [showReveal, setShowReveal] = useState(!!target && gameMode === 'elimination');
  const [counterValue, setCounterValue] = useState(0);
  const [counterDone, setCounterDone] = useState(false);
  const confettiFired = useRef(false);

  // ── Dramatic reveal timer (elimination only) ──────
  useEffect(() => {
    if (target && gameMode === 'elimination') {
      const timer = setTimeout(() => setShowReveal(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowReveal(false);
    }
  }, [target, gameMode]);

  // ── Number counter animation ──────────────────────
  useEffect(() => {
    if (showReveal || !target) return;
    
    const targetNum = parseInt(target);
    if (isNaN(targetNum)) {
      setCounterValue(target);
      setCounterDone(true);
      return;
    }

    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    const tickInterval = 80;
    let lastTick = 0;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic for decelerating counter
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * targetNum);
      setCounterValue(current);

      // Play tick sound periodically
      if (elapsed - lastTick > tickInterval) {
        playTick();
        lastTick = elapsed;
      }

      if (progress >= 1) {
        clearInterval(interval);
        setCounterDone(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [showReveal, target]);

  // ── Confetti + Victory sound ──────────────────────
  useEffect(() => {
    if (!showReveal && !confettiFired.current) {
      confettiFired.current = true;

      // Only fire confetti for winner
      if (isWinner) {
        playVictory();

        // First burst
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#ec4899', '#06b6d4', '#f59e0b', '#7c3aed'],
        });

        // Side cannons
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors: ['#4f46e5', '#ec4899', '#06b6d4', '#f59e0b'],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors: ['#4f46e5', '#ec4899', '#06b6d4', '#f59e0b'],
          });
        }, 300);

        // Gentle afterglow
        setTimeout(() => {
          confetti({
            particleCount: 30,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#f59e0b', '#ec4899'],
            gravity: 0.6,
          });
        }, 700);
      }
    }
  }, [showReveal, isWinner]);

  const handlePlayAgain = () => {
    playClick();
    onPlayAgain();
    if (!isHost) setWaitingForHost(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 mesh-bg vignette relative">

      {/* Winner glow aura */}
      {isWinner && !showReveal && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/10 rounded-full blur-[150px] animate-pulse-glow pointer-events-none z-0" />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass-panel w-full max-w-2xl text-center py-12 md:py-16 min-h-[420px] flex items-center justify-center flex-col z-10"
      >
        <AnimatePresence mode="wait">
          {showReveal ? (
            /* ── Elimination Reveal Animation ────── */
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              className="flex flex-col items-center justify-center relative w-64 h-64 md:w-72 md:h-72 mx-auto"
            >
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
                <motion.circle
                  cx="50" cy="50" r="46"
                  stroke="url(#revealGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="289.03"
                  initial={{ strokeDashoffset: 289.03 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 3, ease: "linear" }}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="revealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <span className="text-brand-secondary text-lg md:text-xl uppercase tracking-[0.15em] font-space font-bold leading-tight animate-pulse neon-text-secondary">
                  So the Survivor Is...
                </span>
              </div>
            </motion.div>
          ) : (
            /* ── Winner Reveal ───────────────────── */
            <motion.div
              key="winner"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="w-full px-6"
            >
              {/* Trophy / Crown */}
              <motion.div
                initial={{ y: -40, opacity: 0, scale: 0.5, rotate: -15 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 12 }}
                className="text-5xl md:text-6xl mb-4"
              >
                {isWinner ? '🏆' : '👑'}
              </motion.div>

              {/* Winner gradient avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-white font-space font-bold text-2xl shadow-xl ring-4 ring-brand-gold/30"
                style={{ background: nameToGradient(winner) }}
              >
                {winner.charAt(0).toUpperCase()}
              </motion.div>

              {/* Game Over label */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-brand-accent font-space font-bold text-xs tracking-[0.2em] uppercase block mb-3"
              >
                Game Over
              </motion.span>

              {/* Winner announcement */}
              <motion.h2
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className={`text-4xl md:text-5xl font-space font-bold mb-5 ${
                  isWinner ? 'text-brand-gold neon-text-gold' : 'text-white'
                }`}
              >
                {isWinner ? "You Won!" : `${winner} Wins!`}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-base text-gray-400 font-inter mb-8 px-4 max-w-md mx-auto leading-relaxed"
              >
                {isWinner
                  ? "Your intuition was perfect! You guessed the hidden number before anyone else!"
                  : `Better luck next time! ${winner} was just a little bit faster this round.`}
              </motion.p>

              {/* ── Stats Card ─────────────────────── */}
              {target && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-dark-surface/50 rounded-xl border border-white/[0.06] p-5 mb-8 max-w-sm mx-auto"
                >
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-space mb-1">
                        Target Number
                      </p>
                      <motion.p
                        className="text-3xl md:text-4xl font-space font-bold text-brand-primary"
                        style={{
                          animation: counterDone ? 'counter-glow 2s ease-in-out infinite' : 'none',
                        }}
                      >
                        {counterValue}
                      </motion.p>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-space mb-1">
                        Game Mode
                      </p>
                      <p className="text-lg font-space font-bold text-white capitalize">
                        {gameMode === 'proximity' && '🌡️ '}
                        {gameMode === 'race' && '🏎️ '}
                        {gameMode === 'elimination' && '💀 '}
                        {gameMode}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Action Buttons ─────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <motion.button
                  onClick={handlePlayAgain}
                  disabled={waitingForHost}
                  className={`primary-btn py-3.5 px-8 text-base font-space ${
                    waitingForHost ? 'opacity-40 cursor-not-allowed' : 'animate-pulse-glow'
                  }`}
                  whileHover={!waitingForHost ? { scale: 1.03 } : {}}
                  whileTap={!waitingForHost ? { scale: 0.97 } : {}}
                >
                  {waitingForHost ? "⏳ Waiting for Host..." : "🔄 Play Again"}
                </motion.button>
                <motion.button
                  onClick={() => { playClick(); onBackToRoom(); }}
                  className="py-3.5 px-8 text-base rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all font-space font-medium"
                  whileTap={{ scale: 0.97 }}
                >
                  ← Back to Room
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
