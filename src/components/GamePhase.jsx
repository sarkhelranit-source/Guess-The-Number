import { useState } from 'react';
import { motion } from 'framer-motion';

export default function GamePhase({ gameState, myNickname, onGuess, lastHint }) {
  const [guess, setGuess] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const isMyTurn = gameState.gameMode === 'standard' 
    ? gameState.players[gameState.currentTurnIndex]?.name === myNickname 
    : true;
  
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
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
              {gameState.gameMode === 'standard' 
                ? (isMyTurn ? "Your Turn!" : "Waiting for others...") 
                : "Make Your Guess!"}
            </h2>
          </div>

          <p className="text-gray-300 mb-8 font-lora">
            Guess the hidden number between 1 and 100!
          </p>

          <form onSubmit={handleGuess} className="flex flex-col gap-6 w-full max-w-sm">
            <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              <input
                type="number"
                className="input-field text-center text-3xl py-4 bg-dark-bg/50 focus:border-brand-primary"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="0"
                disabled={!isMyTurn}
                autoFocus
              />
            </motion.div>
            
            <button type="submit" className="primary-btn py-4 text-lg disabled:opacity-50" disabled={guess === '' || !isMyTurn}>
              Submit Guess
            </button>
          </form>

          <div className="h-12 mt-6 flex items-center justify-center">
            {lastHint && (
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
              const isCurrentTurn = gameState.gameMode === 'standard' && i === gameState.currentTurnIndex;
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isCurrentTurn ? 'bg-brand-primary/20 border-brand-primary' : 'bg-white/5 border-white/10'}`}>
                  <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold border border-brand-primary/30">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-lg text-white font-medium">{p.name} {p.name === myNickname ? '(You)' : ''}</span>
                  {gameState.gameMode === 'standard' && isCurrentTurn && (
                    <span className="ml-auto text-xs text-brand-primary font-bold uppercase tracking-widest">Thinking...</span>
                  )}
                  {gameState.gameMode === 'race' && (
                    <span className="ml-auto text-xs text-brand-secondary font-mono bg-brand-secondary/10 px-2 py-1 rounded">Racing...</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Feed for Standard Mode */}
          {gameState.gameMode === 'standard' && (
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
