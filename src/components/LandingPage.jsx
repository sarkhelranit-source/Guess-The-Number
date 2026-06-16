import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

export default function LandingPage({ onCreateRoom, onJoinRoom }) {
  const containerRef = useRef(null);
  const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');

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
        className="glass-panel z-10 flex flex-col items-center max-w-2xl text-center p-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1 
          className="text-5xl md:text-7xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1, ease: "backOut", delay: 0.2 }}
        >
          Guess The Number
        </motion.h1>

        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 w-full mt-8">
              <button className="primary-btn text-xl px-12 py-4" onClick={() => setMode('create')}>
                Create New Room
              </button>
              <button className="secondary-btn text-xl px-12 py-4 border border-brand-primary text-brand-primary hover:bg-brand-primary/10 transition-colors rounded-lg" onClick={() => setMode('join')}>
                Join Existing Room
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col gap-4 w-full mt-8">
              <input 
                type="text" 
                placeholder="Enter your Nickname" 
                className="input-field text-center text-xl bg-dark-bg/50 border border-brand-primary/30 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-primary transition-colors"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <div className="flex gap-4 mt-2">
                <button className="secondary-btn flex-1 py-3 border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors rounded-lg" onClick={() => setMode('menu')}>Back</button>
                <button 
                  className="primary-btn flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => nickname && onCreateRoom(nickname)}
                  disabled={!nickname}
                >
                  Create
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="flex flex-col gap-4 w-full mt-8">
              <input 
                type="text" 
                placeholder="Enter your Nickname" 
                className="input-field text-center text-xl bg-dark-bg/50 border border-brand-primary/30 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-primary transition-colors"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Room Code (e.g. ABCD)" 
                className="input-field text-center text-xl uppercase tracking-widest font-bold bg-dark-bg/50 border border-brand-primary/30 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-primary transition-colors"
                value={roomId}
                maxLength={4}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              />
              <div className="flex gap-4 mt-2">
                <button className="secondary-btn flex-1 py-3 border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors rounded-lg" onClick={() => setMode('menu')}>Back</button>
                <button 
                  className="primary-btn flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => nickname && roomId.length === 4 && onJoinRoom(nickname, roomId)}
                  disabled={!nickname || roomId.length !== 4}
                >
                  Join
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
