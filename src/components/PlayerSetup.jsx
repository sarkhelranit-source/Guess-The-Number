import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick } from '../services/soundManager';

export default function PlayerSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [count, setCount] = useState('');
  const [names, setNames] = useState([]);
  const [currentName, setCurrentName] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCountSubmit = (e) => {
    e.preventDefault();
    const c = parseInt(count);
    if (c > 0) {
      playClick();
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
    
    playClick();
    const newNames = [...names, currentName];
    setNames(newNames);
    setCurrentName('');

    if (newNames.length === parseInt(count)) {
      onComplete(newNames);
    }
  };

  const step1Variants = {
    initial: isMobile ? { opacity: 0 } : { opacity: 0, x: -50 },
    animate: isMobile ? { opacity: 1 } : { opacity: 1, x: 0 },
    exit: isMobile ? { opacity: 0 } : { opacity: 0, x: 50 },
  };

  const step2Variants = {
    initial: isMobile ? { opacity: 0 } : { opacity: 0, x: -50 },
    animate: isMobile ? { opacity: 1 } : { opacity: 1, x: 0 },
    exit: isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.9 },
  };

  return (
    <div className="min-h-screen w-full flex items-start md:items-center justify-center relative z-10 p-4 pt-12 pb-6 md:py-0 bg-transparent overflow-y-auto">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            variants={step1Variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: isMobile ? 0.2 : 0.4 }}
            className="glass-panel w-full max-w-md"
          >
            <h2 className="text-3xl font-space font-bold text-center mb-6 text-brand-primary neon-text-primary">How many players?</h2>
            <form onSubmit={handleCountSubmit} className="flex flex-col gap-4">
              <input
                type="number"
                min="1"
                className="input-field text-center text-2xl font-space font-bold"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g. 2"
                autoFocus={!isMobile}
              />
              <motion.button
                type="submit"
                className="primary-btn w-full py-3.5 font-space"
                whileHover={isMobile ? {} : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next →
              </motion.button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            variants={step2Variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: isMobile ? 0.2 : 0.4 }}
            className="glass-panel w-full max-w-md"
          >
            <h2 className="text-3xl font-space font-bold text-center mb-6 text-brand-secondary neon-text-secondary">
              Player {names.length + 1}
            </h2>
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                className="input-field text-center text-xl font-space"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                placeholder="Enter Name"
                autoFocus={!isMobile}
              />
              <div className="text-center text-sm text-gray-500 mb-2 font-inter">
                {names.length} / {count} Players Added
              </div>
              <motion.button
                type="submit"
                className="primary-btn w-full py-3.5 font-space"
                whileHover={isMobile ? {} : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {names.length + 1 === parseInt(count) ? "🎮 Start Game" : "Add Player →"}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
