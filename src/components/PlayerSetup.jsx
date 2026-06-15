import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [count, setCount] = useState('');
  const [names, setNames] = useState([]);
  const [currentName, setCurrentName] = useState('');

  const handleCountSubmit = (e) => {
    e.preventDefault();
    const c = parseInt(count);
    if (c > 0) {
      setStep(2);
    } else {
      alert("Please enter a valid number greater than 0");
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (currentName.trim() === '') {
      alert("Name cannot be empty");
      return;
    }
    
    const newNames = [...names, currentName];
    setNames(newNames);
    setCurrentName('');

    if (newNames.length === parseInt(count)) {
      onComplete(newNames);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="glass-panel w-full max-w-md"
          >
            <h2 className="text-3xl font-playfair font-bold text-center mb-6 text-brand-primary">How many players?</h2>
            <form onSubmit={handleCountSubmit} className="flex flex-col gap-4">
              <input
                type="number"
                min="1"
                className="input-field text-center text-2xl"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g. 2"
                autoFocus
              />
              <button type="submit" className="primary-btn w-full">Next</button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-panel w-full max-w-md"
          >
            <h2 className="text-3xl font-playfair font-bold text-center mb-6 text-brand-secondary">
              Player {names.length + 1}
            </h2>
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                className="input-field text-center text-xl"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                placeholder="Enter Name"
                autoFocus
              />
              <div className="text-center text-sm text-gray-400 mb-2">
                {names.length} / {count} Players Added
              </div>
              <button type="submit" className="primary-btn w-full">
                {names.length + 1 === parseInt(count) ? "Start Game" : "Add Player"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
