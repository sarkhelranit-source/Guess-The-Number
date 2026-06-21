import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playGuessSubmit, playError, playClick } from '../services/soundManager';

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

export default function GamePhase({ gameState, myNickname, onGuess, lastHint, roundResults, onLeave }) {
  const [guess, setGuess] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isElimination = gameState.gameMode === 'elimination';
  const isEliminated = isElimination && gameState.eliminated?.includes(myNickname);
  const hasGuessedThisRound = isElimination && gameState.roundGuesses?.[myNickname] !== undefined;

  let isMyTurn = true;
  if (gameState.gameMode === 'proximity') {
    isMyTurn = gameState.players[gameState.currentTurnIndex]?.name === myNickname;
  } else if (isElimination) {
    isMyTurn = !isEliminated && !hasGuessedThisRound;
  }
  
  const handleGuess = (e) => {
    e.preventDefault();
    const num = parseInt(guess);
    if (isNaN(num)) {
      triggerShake();
      playError();
      return;
    }
    playGuessSubmit();
    onGuess(num);
    setGuess('');
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const getStatusMessage = () => {
    if (isElimination) {
      if (isEliminated) return "You have been eliminated! 💀";
      if (hasGuessedThisRound) return "Guess Locked In! Waiting for others... 🔒";
      return "Make Your Blind Guess!";
    }
    if (gameState.gameMode === 'proximity') {
      return isMyTurn ? "Your Turn!" : "Waiting for others...";
    }
    return "Make Your Guess!";
  };

  const panelVariants = {
    initial: isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.92 },
    animate: isMobile ? { opacity: 1 } : { opacity: 1, scale: 1 },
    exit: isMobile ? { opacity: 0 } : { opacity: 0, y: -50 },
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-start justify-start pt-6 pb-6 md:items-center md:justify-center md:p-4 relative bg-transparent overflow-y-auto">
      
      {/* Round Results Overlay for Elimination Mode */}
      <AnimatePresence>
        {roundResults && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-dark-bg/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: -40 }}
              className="glass-panel max-w-lg w-full text-center mx-4"
            >
              <h2 className="text-3xl md:text-4xl font-space font-bold text-white mb-2">Round Over!</h2>
              <p className="text-lg text-gray-300 mb-6 font-inter">
                The target number was <span className="text-brand-secondary font-space font-bold text-2xl neon-text-secondary">{roundResults.target}</span>
              </p>
              
              <div className="space-y-2 text-left mb-6">
                {roundResults.guesses.sort((a,b) => a.diff - b.diff).map((g, i) => (
                  <div key={i} className="flex justify-between items-center bg-dark-surface/60 p-3 rounded-lg border border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-space font-bold text-xs"
                        style={{ background: nameToGradient(g.name) }}
                      >
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-space font-bold text-white">{g.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-inter">Guessed {g.guess}</span>
                      <span className="text-sm text-gray-500 ml-2 font-inter">(off by {g.diff})</span>
                    </div>
                  </div>
                ))}
              </div>

              {roundResults.isTiebreaker ? (
                <div className="bg-brand-gold/10 text-brand-gold font-space font-bold p-4 rounded-xl border border-brand-gold/30 neon-text-gold">
                  IT'S A TIE! No one was eliminated. Starting a tiebreaker round!
                </div>
              ) : (
                <div className="bg-red-500/10 text-red-400 font-space font-bold p-4 rounded-xl border border-red-500/30">
                  {roundResults.eliminated.join(', ')} {roundResults.eliminated.length === 1 ? 'was' : 'were'} furthest and got Eliminated! 💀
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: isMobile ? 0.2 : 0.4 }}
        className="glass-panel w-full max-w-4xl grid md:grid-cols-2 gap-6 md:gap-8 p-4 sm:p-6 md:p-8 z-10"
      >
        {/* Left Col: Game Info & Input */}
        <div className="flex flex-col items-center text-center md:border-r border-white/[0.06] md:pr-8">
          <div className="mb-6">
            <span className="inline-block text-brand-accent font-space font-bold text-xs tracking-[0.2em] uppercase bg-brand-accent/10 px-3 py-1 rounded-full border border-brand-accent/20 mb-3">
              {gameState.gameMode === 'proximity' && '🌡️ '}
              {gameState.gameMode === 'race' && '🏎️ '}
              {gameState.gameMode === 'elimination' && '💀 '}
              {gameState.gameMode} MODE
            </span>
            <h2 className="text-2xl md:text-3xl font-space font-bold text-brand-primary neon-text-primary mt-2">
              {getStatusMessage()}
            </h2>
          </div>

          <p className="text-gray-400 mb-8 font-inter text-sm leading-relaxed max-w-xs">
            {isElimination 
              ? "Guess the hidden number between 1 and 100! You only get ONE blind guess per round. The furthest guesser is eliminated."
              : "Guess the hidden number between 1 and 100!"}
          </p>

          <form onSubmit={handleGuess} className="flex flex-col gap-4 w-full max-w-sm">
            <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              <input
                type="number"
                className={`input-field text-center text-3xl py-4 font-space font-bold ${!isMyTurn ? 'opacity-40 cursor-not-allowed' : ''}`}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="?"
                disabled={!isMyTurn}
                autoFocus={isMyTurn && !isMobile}
              />
            </motion.div>
            
            <motion.button
              type="submit"
              className="primary-btn py-4 text-base font-space disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={guess === '' || !isMyTurn}
              whileHover={guess && isMyTurn && !isMobile ? { scale: 1.02 } : {}}
              whileTap={guess && isMyTurn ? { scale: 0.98 } : {}}
            >
              Submit Guess
            </motion.button>
          </form>

          <div className="h-12 mt-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {lastHint && !isElimination && (
                <motion.p
                  key={lastHint}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="font-space font-bold text-brand-secondary text-xl neon-text-secondary"
                >
                  {lastHint}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Col: Feed & Status */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2 mb-4">
            <h3 className="text-base font-space font-bold text-white">Players</h3>
            <button 
              onClick={() => { playClick(); onLeave(); }} 
              className="text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 px-2.5 py-1 rounded-md transition-colors uppercase tracking-widest font-space font-bold"
            >
              Leave Game
            </button>
          </div>
          <div className="flex flex-col gap-2.5 mb-6">
            <AnimatePresence>
            {gameState.players.map((p, i) => {
              const isCurrentTurn = gameState.gameMode === 'proximity' && i === gameState.currentTurnIndex;
              const isPlayerEliminated = isElimination && gameState.eliminated?.includes(p.name);
              const hasPlayerGuessed = isElimination && gameState.roundGuesses?.[p.name] !== undefined;
              const isDisconnected = p.isDisconnected;

              if (isDisconnected) return null;

              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout={!isMobile}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isCurrentTurn && !isDisconnected
                      ? 'bg-brand-primary/10 border-brand-primary/40'
                      : 'bg-dark-surface/40 border-white/[0.06]'
                  } ${(isPlayerEliminated || isDisconnected) ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-space font-bold text-sm text-white ${
                        isPlayerEliminated ? '' : ''
                      }`}
                      style={{
                        background: isPlayerEliminated
                          ? 'linear-gradient(135deg, #4b5563, #374151)'
                          : nameToGradient(p.name)
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    {!isPlayerEliminated && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-dark-bg" />
                    )}
                  </div>
                  <span className={`text-sm font-inter font-medium ${(isPlayerEliminated || isDisconnected) ? 'text-gray-600' : 'text-white'} ${isPlayerEliminated ? 'line-through' : ''}`}>
                    {p.name} {p.name === myNickname ? '(You)' : ''}
                  </span>
                  
                  {isDisconnected && (
                    <span className="ml-auto text-[10px] bg-red-500/15 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-md font-space font-bold uppercase">
                      Offline
                    </span>
                  )}
                  {isPlayerEliminated && !isDisconnected && (
                    <span className="ml-auto text-[10px] text-red-500 font-space font-bold uppercase tracking-widest">💀 Dead</span>
                  )}
                  {isElimination && !isPlayerEliminated && hasPlayerGuessed && !isDisconnected && (
                    <span className="ml-auto text-[10px] text-brand-secondary font-space font-bold uppercase tracking-widest">🔒 Locked</span>
                  )}
                  {isElimination && !isPlayerEliminated && !hasPlayerGuessed && !isDisconnected && (
                    <span className="ml-auto text-[10px] text-gray-500 font-space font-bold uppercase tracking-widest animate-pulse">Thinking...</span>
                  )}
                  {gameState.gameMode === 'proximity' && isCurrentTurn && !isDisconnected && (
                    <span className="ml-auto text-[10px] text-brand-primary font-space font-bold uppercase tracking-widest animate-pulse">Thinking...</span>
                  )}
                  {gameState.gameMode === 'race' && !isDisconnected && (
                    <span className="ml-auto text-[10px] text-brand-accent font-space bg-brand-accent/10 px-2 py-0.5 rounded-md border border-brand-accent/20">Racing...</span>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>

          {/* Live Feed for Proximity Mode */}
          {gameState.gameMode === 'proximity' && (
            <>
              <h3 className="text-base font-space font-bold border-b border-white/[0.06] pb-2 mb-4 text-white">Live Feed</h3>
              <div className="flex-1 bg-dark-surface/30 rounded-xl p-4 overflow-y-auto max-h-48 space-y-2 border border-white/[0.06] flex flex-col-reverse">
                {gameState.messages?.map((msg, i) => (
                  <div key={i} className="text-sm font-inter">
                    <span className="font-bold text-brand-secondary">{msg.nickname}: </span>
                    <span className="text-gray-300">{msg.message}</span>
                  </div>
                ))}
                {(!gameState.messages || gameState.messages.length === 0) && (
                  <p className="text-gray-600 italic text-sm font-inter">No guesses yet...</p>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
