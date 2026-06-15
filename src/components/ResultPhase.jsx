import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

export default function ResultPhase({ playerNames, turns, onRestart }) {
  const resultRef = useRef(null);

  let minTurn = Math.min(...turns);
  let drawIndex = [];
  
  for (let i = 0; i < turns.length; i++) {
      if (turns[i] === minTurn) {
          drawIndex.push(i);
      }
  }
  
  let isTie = drawIndex.length > 1;
  let winners = drawIndex.map(index => playerNames[index]);

  useEffect(() => {
    if (resultRef.current) {
      gsap.fromTo(resultRef.current, 
        { scale: 0.5, opacity: 0, rotation: -10 }, 
        { scale: 1, opacity: 1, rotation: 0, duration: 1.5, ease: "elastic.out(1, 0.5)", delay: 0.5 }
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        className="glass-panel w-full max-w-2xl text-center relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/10 z-0"></div>
        
        <div className="relative z-10" ref={resultRef}>
          <h2 className="text-2xl font-lora text-gray-300 mb-2 uppercase tracking-widest">
            {isTie ? "It's a Tie!" : "We have a Winner!"}
          </h2>
          
          <h1 className="text-6xl md:text-7xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary my-6 leading-tight">
            {winners.join(" & ")}
          </h1>
          
          <p className="text-2xl text-gray-200 mb-12 font-lora">
            Guessed the number in <span className="font-bold text-white">{minTurn}</span> turns!
          </p>

          <motion.button 
            className="primary-btn px-10 py-4 text-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRestart}
          >
            Play Again
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
