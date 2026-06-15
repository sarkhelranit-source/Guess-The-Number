import { useState } from 'react';
import { motion } from 'framer-motion';

export default function GamePhase({ playerNames, targetNumbers, onComplete }) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error', 'info', 'success'
  const [turns, setTurns] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const currentPlayer = playerNames[currentPlayerIndex];
  const target = targetNumbers[currentPlayerIndex];

  const handleGuess = (e) => {
    e.preventDefault();
    const num = parseInt(guess);
    const newTurn = currentTurn + 1;
    setCurrentTurn(newTurn);

    if (isNaN(num)) {
      showMessage("Please enter a valid number!", "error");
      triggerShake();
    } else if (num < target) {
      showMessage("Try something bigger! 📈", "info");
      triggerShake();
    } else if (num > target) {
      showMessage("Try something smaller! 📉", "info");
      triggerShake();
    } else {
      showMessage(`Correct! You took ${newTurn} turns. 🎉`, "success");
      
      setTimeout(() => {
        const newTurnsList = [...turns, newTurn];
        if (currentPlayerIndex + 1 < playerNames.length) {
          setTurns(newTurnsList);
          setCurrentTurn(0);
          setGuess('');
          setMessage('');
          setCurrentPlayerIndex(currentPlayerIndex + 1);
        } else {
          onComplete(newTurnsList);
        }
      }, 2000);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
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
        className="glass-panel w-full max-w-lg text-center"
      >
        <div className="mb-8">
          <span className="text-brand-secondary font-bold text-sm tracking-widest uppercase">Current Turn</span>
          <h2 className="text-4xl font-playfair font-bold text-brand-primary mt-2">
            {currentPlayer}
          </h2>
        </div>

        <p className="text-gray-300 mb-8 font-lora">
          We've selected a number between 1 to 100. Enter your guess!
        </p>

        <form onSubmit={handleGuess} className="flex flex-col gap-6">
          <motion.div
            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <input
              type="number"
              className="input-field text-center text-3xl py-4"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </motion.div>
          
          <button type="submit" className="primary-btn py-4 text-lg">Make a Guess</button>
        </form>

        <div className="h-12 mt-6 flex items-center justify-center">
          {message && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-bold ${
                messageType === 'error' ? 'text-red-500' : 
                messageType === 'success' ? 'text-green-400 text-xl' : 'text-blue-400'
              }`}
            >
              {message}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
