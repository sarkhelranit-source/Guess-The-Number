import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GamePhase({ gameState, myNickname, onGuess, lastHint, roundResults }) {
  const [guess, setGuess] = useState('');
  const [isShaking, setIsShaking] = useState(false);

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
      return;
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      
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
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: -50 }}
              className="bg-brand-primary/20 border border-brand-primary/50 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl"
            >
              <h2 className="text-4xl font-playfair font-bold text-white mb-2">Round Over!</h2>
              <p className="text-xl text-gray-300 mb-6">
                The target number was <span className="text-brand-secondary font-black text-3xl">{roundResults.target}</span>
              </p>
              
              <div className="space-y-2 text-left mb-6">
                {roundResults.guesses.sort((a,b) => a.diff - b.diff).map((g, i) => (
                  <div key={i} className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                    <span className="font-bold">{g.name}</span>
                    <div className="text-right">
                      <span className="text-white">Guessed {g.guess}</span>
                      <span className="text-sm text-gray-400 ml-2">(off by {g.diff})</span>
                    </div>
                  </div>
                ))}
              </div>

              {roundResults.isTiebreaker ? (
                <div className="bg-yellow-500/20 text-yellow-300 font-bold p-4 rounded-xl border border-yellow-500/50">
                  IT'S A TIE! No one was eliminated. Starting a tiebreaker round!
                </div>
              ) : (
                <div className="bg-red-500/20 text-red-300 font-bold p-4 rounded-xl border border-red-500/50">
                  {roundResults.eliminated.join(', ')} {roundResults.eliminated.length === 1 ? 'was' : 'were'} furthest and got Eliminated! 💀
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, y: -50 }}
        className="glass-panel w-full max-w-4xl grid md:grid-cols-2 gap-8 p-8"
      >
        {/* Left Col: Game Info & Input */}
        <div className="flex flex-col items-center text-center border-r border-white/10 pr-8">
          <div className="mb-8">
            <span className="text-brand-secondary font-bold text-sm tracking-widest uppercase">
              {gameState.gameMode} MODE
            </span>
            <h2 className="text-3xl font-playfair font-bold text-brand-primary mt-2">
              {getStatusMessage()}
            </h2>
          </div>

          <p className="text-gray-300 mb-8 font-lora">
            {isElimination 
              ? "Guess the hidden number between 1 and 100! You only get ONE blind guess per round. The furthest guesser is eliminated."
              : "Guess the hidden number between 1 and 100!"}
          </p>

          <form onSubmit={handleGuess} className="flex flex-col gap-6 w-full max-w-sm">
            <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              <input
                type="number"
                className={`input-field text-center text-3xl py-4 bg-dark-bg/50 focus:border-brand-primary ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="0"
                disabled={!isMyTurn}
                autoFocus={isMyTurn}
              />
            </motion.div>
            
            <button type="submit" className="primary-btn py-4 text-lg disabled:opacity-50" disabled={guess === '' || !isMyTurn}>
              Submit Guess
            </button>
          </form>

          <div className="h-12 mt-6 flex items-center justify-center">
            {lastHint && !isElimination && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-bold text-brand-secondary text-2xl">
                {lastHint}
              </motion.p>
            )}
          </div>
        </div>

        {/* Right Col: Feed & Status */}
        <div className="flex flex-col">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2 mb-4">Players</h3>
          <div className="flex flex-col gap-3 mb-6">
            {gameState.players.map((p, i) => {
              const isCurrentTurn = gameState.gameMode === 'proximity' && i === gameState.currentTurnIndex;
              const isPlayerEliminated = isElimination && gameState.eliminated?.includes(p.name);
              const hasPlayerGuessed = isElimination && gameState.roundGuesses?.[p.name] !== undefined;

              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isCurrentTurn ? 'bg-brand-primary/20 border-brand-primary' : 'bg-white/5 border-white/10'} ${isPlayerEliminated ? 'opacity-50 grayscale' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${isPlayerEliminated ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-brand-primary/20 text-brand-primary border-brand-primary/30'}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-lg font-medium ${isPlayerEliminated ? 'text-gray-500 line-through' : 'text-white'}`}>{p.name} {p.name === myNickname ? '(You)' : ''}</span>
                  
                  {isPlayerEliminated && (
                    <span className="ml-auto text-xs text-red-500 font-bold uppercase tracking-widest">💀 Dead</span>
                  )}
                  {isElimination && !isPlayerEliminated && hasPlayerGuessed && (
                    <span className="ml-auto text-xs text-brand-secondary font-bold uppercase tracking-widest">🔒 Locked In</span>
                  )}
                  {isElimination && !isPlayerEliminated && !hasPlayerGuessed && (
                    <span className="ml-auto text-xs text-gray-400 font-bold uppercase tracking-widest">Thinking...</span>
                  )}
                  {gameState.gameMode === 'proximity' && isCurrentTurn && (
                    <span className="ml-auto text-xs text-brand-primary font-bold uppercase tracking-widest">Thinking...</span>
                  )}
                  {gameState.gameMode === 'race' && (
                    <span className="ml-auto text-xs text-brand-secondary font-mono bg-brand-secondary/10 px-2 py-1 rounded">Racing...</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Feed for Proximity Mode */}
          {gameState.gameMode === 'proximity' && (
            <>
              <h3 className="text-xl font-bold border-b border-white/10 pb-2 mb-4">Live Feed</h3>
              <div className="flex-1 bg-dark-bg/50 rounded-lg p-4 overflow-y-auto max-h-48 space-y-2 border border-white/5 flex flex-col-reverse">
                {gameState.messages?.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-bold text-brand-secondary">{msg.nickname}: </span>
                    <span className="text-gray-300">{msg.message}</span>
                  </div>
                ))}
                {(!gameState.messages || gameState.messages.length === 0) && (
                  <p className="text-gray-500 italic text-sm">No guesses yet...</p>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
