import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function ResultPhase({ winner, myNickname, isHost, onPlayAgain, onBackToRoom, target, gameMode }) {
  const isWinner = winner === myNickname;
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [showReveal, setShowReveal] = useState(!!target && gameMode === 'elimination');

  useEffect(() => {
    if (target && gameMode === 'elimination') {
      const timer = setTimeout(() => setShowReveal(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowReveal(false);
    }
  }, [target, gameMode]);

  const handlePlayAgain = () => {
    onPlayAgain();
    if (!isHost) setWaitingForHost(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        className="glass-panel w-full max-w-2xl text-center py-16 min-h-[400px] flex items-center justify-center flex-col"
      >
        <AnimatePresence mode="wait">
          {showReveal ? (
            <motion.div 
              key="reveal"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center relative w-72 h-72 mx-auto"
            >
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                <motion.circle 
                  cx="50" cy="50" r="48" 
                  stroke="#ec4899" // brand secondary color
                  strokeWidth="4" 
                  fill="none" 
                  strokeDasharray="301.59" 
                  initial={{ strokeDashoffset: 301.59 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 3, ease: "linear" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <span className="text-brand-secondary text-xl uppercase tracking-widest font-black leading-tight animate-pulse">
                  So the Survivor Is...
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="winner"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full"
            >
              <span className="text-brand-secondary font-bold text-sm tracking-widest uppercase block mb-4">
                Game Over
              </span>
              <h2 className="text-5xl font-playfair font-black text-brand-primary mb-6">
                {isWinner ? "You Won! 🎉" : `${winner} Wins! 👑`}
              </h2>
              <p className="text-xl text-gray-300 font-lora mb-12 px-8">
                {isWinner 
                  ? "Your intuition was perfect! You guessed the hidden number before anyone else!"
                  : `Better luck next time! ${winner} was just a little bit faster this round.`}
                {target && <span className="block mt-4 text-brand-secondary">The target number was {target}!</span>}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handlePlayAgain} 
                  disabled={waitingForHost}
                  className={`primary-btn py-4 px-8 text-lg ${waitingForHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {waitingForHost ? "Waiting for Host..." : "Play Again"}
                </button>
                <button 
                  onClick={onBackToRoom} 
                  className="py-4 px-8 text-lg border border-white/20 hover:bg-white/10 rounded-lg font-bold transition-all text-white"
                >
                  Back to Room
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
