import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

export default function LandingPage({ onStart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // GSAP Floating Numbers Background
    const container = containerRef.current;
    if (!container) return;

    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.innerText = Math.floor(Math.random() * 100);
      el.className = 'absolute text-brand-primary/20 font-playfair font-bold text-4xl select-none pointer-events-none';
      
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;
      
      gsap.set(el, { x: startX, y: startY, scale: Math.random() * 0.5 + 0.5 });
      container.appendChild(el);

      gsap.to(el, {
        y: startY - 200 - Math.random() * 200,
        x: startX + (Math.random() - 0.5) * 100,
        rotation: Math.random() * 360,
        opacity: 0,
        duration: Math.random() * 5 + 5,
        repeat: -1,
        ease: "none",
        delay: -Math.random() * 10
      });
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-dark-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-primary/20 via-dark-bg to-dark-bg z-0"></div>
      
      {/* Dedicated container for GSAP floating numbers */}
      <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none"></div>

      <motion.div 
        className="glass-panel z-10 flex flex-col items-center max-w-2xl text-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1 
          className="text-6xl md:text-8xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1, ease: "backOut", delay: 0.2 }}
        >
          Guess The Number
        </motion.h1>
        
        <p className="text-xl text-gray-300 mb-10 font-lora">
          A thrilling multiplayer challenge of deduction and intuition. 
          Who will find the hidden number first?
        </p>

        <motion.button 
          className="primary-btn text-xl px-12 py-4"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
        >
          Play Now
        </motion.button>
      </motion.div>
    </div>
  );
}
