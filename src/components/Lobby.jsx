import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playJoin } from '../services/soundManager';

// ── Deterministic gradient avatar from name ─────────
function nameToGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 60 + (hash % 60)) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 75%, 55%), hsl(${h2}, 80%, 45%))`;
}

// ── Game mode config ────────────────────────────────
const gameModes = [
  {
    id: 'PROXIMITY',
    title: 'Proximity Hints',
    icon: '🌡️',
    desc: 'Turn-based guessing with temperature hints.',
    fullRules: "Turn-based guessing. The game tells you how close a guess is based on temperature: 🌋 Boiling (within 5), 🔥 Hot (within 15), ☀️ Warm (within 30), 🧊 Cold (within 50), or ❄️ Freezing (more than 50 away).",
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    id: 'RACE',
    title: 'Race',
    icon: '🏎️',
    desc: 'First to guess the number wins the round.',
    fullRules: "Everyone races to guess the same hidden number at the same time. No turns! First to guess correctly wins instantly.",
    gradient: 'from-brand-primary/20 to-brand-accent/20',
  },
  {
    id: 'ELIMINATION',
    title: 'Elimination',
    icon: '💀',
    desc: 'Slowest guesser is eliminated each round.',
    fullRules: "Everyone guesses one number per round. The player whose guess is furthest from the secret number is eliminated. Last player standing wins.",
    gradient: 'from-red-500/20 to-brand-secondary/20',
  },
];

export default function Lobby({ players, roomId, isHost, gameMode: initialGameMode, setGameMode, onStartGame, onLeave }) {
  const [localMode, setLocalMode] = useState(initialGameMode?.toLowerCase() || 'race');
  const [infoMode, setInfoMode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [prevPlayerCount, setPrevPlayerCount] = useState(players.length);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (initialGameMode) setLocalMode(initialGameMode.toLowerCase());
  }, [initialGameMode]);

  // Play sound when a new player joins
  useEffect(() => {
    if (players.length > prevPlayerCount) {
      playJoin();
    }
    setPrevPlayerCount(players.length);
  }, [players.length]);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      playClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = roomId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectMode = (mode) => {
    if (!isHost) return;
    playClick();
    setLocalMode(mode.id.toLowerCase());
    if (setGameMode) setGameMode(mode.id.toLowerCase());
  };

  const panelVariants = {
    initial: isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 30 },
    animate: isMobile ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 },
    exit: isMobile ? { opacity: 0 } : { opacity: 0, scale: 1.05 },
  };

  return (
    <div className="w-full min-h-screen flex items-start md:items-center justify-center p-4 md:p-6 pt-8 pb-8 md:py-6 bg-transparent relative overflow-y-auto">

      <motion.div
        className="glass-panel z-10 w-full max-w-4xl p-6 md:p-8"
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: isMobile ? 0.2 : 0.5, ease: "easeOut" }}
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-space font-bold text-white mb-1">
              Game Lobby
            </h2>
            <p className="text-gray-500 font-inter text-sm">Waiting for players to join...</p>
          </div>

          {/* Room Code with Copy */}
          <div className="flex flex-col items-end">
            <p className="text-xs text-brand-accent uppercase tracking-[0.2em] font-bold font-space mb-1.5">
              Room Code
            </p>
            <motion.button
              onClick={handleCopyRoomCode}
              className="group relative flex items-center gap-3 bg-dark-surface border border-white/10 hover:border-brand-primary/40 px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              whileHover={isMobile ? {} : { scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-3xl md:text-4xl font-space font-bold text-white tracking-[0.25em]">
                {isMobile ? roomId : roomId.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-green-400 text-lg"
                  >
                    ✓
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-gray-500 group-hover:text-brand-primary transition-colors text-sm"
                  >
                    📋
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-green-400 font-inter mt-1"
                >
                  Copied to clipboard!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Main Content Grid ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">

          {/* ── Players List ────────────────────── */}
          <div>
            <h3 className="text-lg font-space font-bold text-white mb-4 flex items-center gap-2.5">
              Players
              <span className="bg-brand-primary/15 text-brand-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-brand-primary/20">
                {players.length}
              </span>
            </h3>
            <ul className="space-y-2.5">
              <AnimatePresence>
                {players.map((player, index) => {
                  if (player.isDisconnected) return null;
                  return (
                  <motion.li
                    key={player.name}
                    initial={isMobile ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={isMobile ? { opacity: 0 } : { opacity: 0, x: 30 }}
                    transition={isMobile ? { duration: 0.15 } : { delay: index * 0.05, duration: 0.3 }}
                    layout={!isMobile}
                    className="flex items-center gap-3 bg-dark-surface/60 p-3 rounded-xl border transition-colors border-white/[0.06] hover:border-white/[0.12]"
                  >
                    {/* Gradient Avatar with Pulse Dot */}
                    <div className="relative pulse-dot">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-space font-bold text-base shadow-lg"
                        style={{ background: nameToGradient(player.name) }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <span className="text-base text-white font-inter font-medium">
                      {player.name}
                    </span>

                    {index === 0 && (
                      <motion.span
                        initial={isMobile ? { opacity: 1 } : { scale: 0 }}
                        animate={isMobile ? { opacity: 1 } : { scale: 1 }}
                        className="ml-auto text-[10px] bg-brand-gold/15 border border-brand-gold/30 text-brand-gold px-2.5 py-1 rounded-md font-space font-bold tracking-wider uppercase"
                      >
                        👑 Host
                      </motion.span>
                    )}
                  </motion.li>
                )})}
              </AnimatePresence>

              {players.length === 0 && (
                <div className="text-center p-8 bg-dark-surface/30 rounded-xl border border-dashed border-white/10 text-gray-500 italic font-inter text-sm">
                  No players connected yet.
                </div>
              )}
            </ul>
          </div>

          {/* ── Game Settings ────────────────────── */}
          <div className="flex flex-col">
            <h3 className="text-lg font-space font-bold text-white mb-4">Game Mode</h3>
            <div className="space-y-3 mb-auto">
              {gameModes.map((mode) => {
                const isSelected = localMode === mode.id.toLowerCase();
                return (
                  <motion.div
                    key={mode.id}
                    onClick={() => handleSelectMode(mode)}
                    whileHover={isHost && !isMobile ? { scale: 1.01 } : {}}
                    whileTap={isHost ? { scale: 0.99 } : {}}
                    className={`glow-card ${isSelected ? 'selected' : ''} w-full text-left p-4 ${
                      !isHost ? 'opacity-75' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <h4 className={`text-base font-space font-bold flex items-center gap-2 ${
                        isSelected ? 'text-brand-primary' : 'text-white'
                      }`}>
                        <span className="text-lg">{mode.icon}</span>
                        {mode.title}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playClick(); setInfoMode(mode); }}
                        className="text-[10px] bg-white/5 text-gray-400 px-2.5 py-1 rounded-md border border-white/10 hover:bg-brand-primary/20 hover:text-brand-primary hover:border-brand-primary/30 transition-all cursor-pointer font-space font-bold uppercase tracking-wider"
                      >
                        Rules
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 font-inter leading-relaxed">
                      {mode.desc}
                    </p>
                    {isSelected && (
                      <motion.div
                        layoutId="mode-indicator"
                        className="h-0.5 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full mt-3"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ── Action Buttons ──────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-white/[0.06]">
              <motion.button
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all font-space font-medium text-sm"
                onClick={() => { playClick(); onLeave(); }}
                whileTap={{ scale: 0.97 }}
              >
                Leave Room
              </motion.button>
              {isHost ? (
                <motion.button
                  className="primary-btn flex-1 py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => { playClick(); onStartGame(); }}
                  disabled={players.length < 1}
                  whileHover={players.length >= 1 && !isMobile ? { scale: 1.02 } : {}}
                  whileTap={players.length >= 1 ? { scale: 0.98 } : {}}
                >
                  🎮 Start Game
                </motion.button>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-dark-surface/40 rounded-xl border border-dashed border-white/10 text-gray-500 font-inter text-sm py-3.5">
                  <span className="animate-pulse">Waiting for host...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Rules Modal ──────────────────────────── */}
      <AnimatePresence>
        {infoMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setInfoMode(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="glass-panel max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{infoMode.icon}</span>
                <h3 className="text-2xl font-space font-bold text-white">
                  {infoMode.title}
                </h3>
              </div>
              <p className="text-base text-gray-300 font-inter leading-relaxed mb-8">
                {infoMode.fullRules}
              </p>
              <motion.button
                className="primary-btn w-full py-3 text-base font-space"
                onClick={() => setInfoMode(null)}
                whileTap={{ scale: 0.98 }}
              >
                Got it!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
