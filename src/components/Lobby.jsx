import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Lobby({ players, roomId, isHost, gameMode: initialGameMode, setGameMode, onStartGame, onLeave }) {
  const [localMode, setLocalMode] = useState(initialGameMode?.toLowerCase() || 'race');
  const [infoMode, setInfoMode] = useState(null);

  useEffect(() => {
    if (initialGameMode) setLocalMode(initialGameMode.toLowerCase());
  }, [initialGameMode]);

  const gameModes = [
    { id: 'PROXIMITY', title: 'Proximity Hints', desc: 'Turn-based guessing with temperature hints.', fullRules: "Turn-based guessing. The game tells you how close a guess is based on temperature: Boiling (within 5), Hot (within 15), Warm (within 30), Cold (within 50), or Freezing (more than 50 away)." },
    { id: 'RACE', title: 'Race', desc: 'First to guess the number wins the round.', fullRules: "Everyone races to guess the same hidden number at the same time. No turns! First to guess correctly wins instantly." },
    { id: 'ELIMINATION', title: 'Elimination', desc: 'Slowest guesser is eliminated each round.', fullRules: "Everyone guesses one number per round. The player whose guess is furthest from the secret number is eliminated. Last player standing wins." }
  ];

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6 bg-dark-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-secondary/10 via-dark-bg to-dark-bg z-0"></div>
      
      <motion.div 
        className="glass-panel z-10 w-full max-w-4xl p-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
      >
        <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-4xl font-playfair font-bold text-white mb-2">Game Lobby</h2>
            <p className="text-gray-400">Waiting for players to join...</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-primary uppercase tracking-widest font-bold mb-1">Room Code</p>
            <div className="bg-dark-bg border border-brand-primary/30 px-6 py-2 rounded-lg">
              <p className="text-5xl font-mono font-black text-white tracking-widest">{roomId}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Players List */}
          <div>
            <h3 className="text-2xl font-lora text-white mb-4 flex items-center gap-2">
              Players <span className="bg-brand-primary/20 text-brand-primary text-sm px-3 py-1 rounded-full">{players.length}</span>
            </h3>
            <ul className="space-y-3">
              {players.map((player, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xl border border-brand-primary/30">
                    {player.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-lg text-white font-medium">{player}</span>
                  {index === 0 && <span className="ml-auto text-xs bg-brand-secondary/20 border border-brand-secondary/50 text-brand-secondary px-2 py-1 rounded font-bold tracking-wider uppercase">Host</span>}
                </motion.li>
              ))}
              {players.length === 0 && (
                <div className="text-center p-6 bg-white/5 rounded-lg border border-white/10 text-gray-500 italic">
                  No players connected yet.
                </div>
              )}
            </ul>
          </div>

          {/* Game Settings */}
          <div className="flex flex-col">
            <h3 className="text-2xl font-lora text-white mb-4">Game Mode</h3>
            <div className="space-y-4 mb-auto">
              {gameModes.map(mode => {
                const isSelected = localMode === mode.id.toLowerCase();
                return (
                  <div
                    key={mode.id}
                    onClick={() => {
                      if (!isHost) return;
                      setLocalMode(mode.id.toLowerCase());
                      if (setGameMode) setGameMode(mode.id.toLowerCase());
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-brand-primary/20 border-brand-primary' 
                        : 'bg-dark-bg/50 border-white/10 hover:border-brand-primary/50'
                    } ${!isHost ? 'opacity-80' : 'cursor-pointer'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className={`text-lg font-bold ${isSelected ? 'text-brand-primary' : 'text-white'}`}>
                        {mode.title}
                      </h4>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setInfoMode(mode); }}
                        className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1 rounded border border-brand-primary/30 hover:bg-brand-primary hover:text-white transition-colors cursor-pointer z-10 relative font-bold uppercase tracking-wider"
                      >
                        Rules
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{mode.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
              <button className="secondary-btn flex-1 py-4 border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors rounded-lg" onClick={onLeave}>Leave Room</button>
              {isHost ? (
                <button 
                  className="primary-btn flex-1 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onStartGame}
                  disabled={players.length < 1} // Can test with 1 player
                >
                  Start Game
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-dark-bg/50 rounded-lg border border-white/10 text-gray-400 font-medium">
                  Waiting for host...
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Rules Modal Overlay */}
      {infoMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInfoMode(null)}>
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-dark-bg border border-brand-primary/50 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-3xl font-playfair font-bold text-white mb-4 text-brand-primary">{infoMode.title} Rules</h3>
            <p className="text-lg text-gray-300 leading-relaxed mb-8">{infoMode.fullRules}</p>
            <button 
              className="primary-btn w-full py-3 text-lg font-bold"
              onClick={() => setInfoMode(null)}
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
