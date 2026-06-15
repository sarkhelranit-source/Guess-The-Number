import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './components/LandingPage';
import PlayerSetup from './components/PlayerSetup';
import GamePhase from './components/GamePhase';
import ResultPhase from './components/ResultPhase';

function App() {
  const [phase, setPhase] = useState('landing'); // 'landing', 'setup', 'playing', 'result'
  const [playerNames, setPlayerNames] = useState([]);
  const [targetNumbers, setTargetNumbers] = useState([]);
  const [turns, setTurns] = useState([]);

  const handleStartSetup = () => {
    setPhase('setup');
  };

  const handleSetupComplete = (names) => {
    setPlayerNames(names);
    const numbers = Array.from({ length: names.length }, () => Math.floor(Math.random() * 100) + 1);
    setTargetNumbers(numbers);
    setPhase('playing');
  };

  const handleGameComplete = (finalTurns) => {
    setTurns(finalTurns);
    setPhase('result');
  };

  const handleRestart = () => {
    setPlayerNames([]);
    setTargetNumbers([]);
    setTurns([]);
    setPhase('landing');
  };

  return (
    <div className="relative min-h-screen bg-dark-bg text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute inset-0"
          >
            <LandingPage onStart={handleStartSetup} />
          </motion.div>
        )}
        
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0"
          >
            <PlayerSetup onComplete={handleSetupComplete} />
          </motion.div>
        )}
        
        {phase === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="absolute inset-0"
          >
            <GamePhase 
              playerNames={playerNames} 
              targetNumbers={targetNumbers} 
              onComplete={handleGameComplete} 
            />
          </motion.div>
        )}
        
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <ResultPhase 
              playerNames={playerNames} 
              turns={turns} 
              onRestart={handleRestart} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
