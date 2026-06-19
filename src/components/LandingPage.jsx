import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { playClick } from '../services/soundManager';

// ── Typewriter letter animation variants ────────────
const titleText = "Guess The Number";
const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.8 + i * 0.06,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// ── Deterministic color from index ──────────────────
const PARTICLE_COLORS = [
  '79, 70, 229',   // indigo
  '236, 72, 153',  // pink
  '6, 182, 212',   // cyan
  '124, 58, 237',  // purple
];

export default function LandingPage({ onCreateRoom, onJoinRoom }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef(null);
  const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [titleDone, setTitleDone] = useState(false);

  // ── Particle Constellation System ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let lastWidth = window.innerWidth;
    const resize = () => {
      // Only resize if width changes to prevent canvas thrashing when mobile keyboard pops up
      if (window.innerWidth !== lastWidth || !canvas.width) {
        lastWidth = window.innerWidth;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const NUM_PARTICLES = window.innerWidth < 768 ? 20 : 45;
    const particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        number: Math.floor(Math.random() * 100),
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        alpha: Math.random() * 0.4 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;

    const CONNECTION_DIST = 120;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.001;

      particles.forEach((p, i) => {
        // Mouse repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150;
          p.vx += (dx / dist) * force * 0.3;
          p.vy += (dy / dist) * force * 0.3;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Pulse alpha
        const pulse = Math.sin(time * p.pulseSpeed * 10 + p.pulseOffset) * 0.15 + 0.85;
        const currentAlpha = p.alpha * pulse;

        // Draw number text
        ctx.save();
        ctx.font = `${Math.round(p.radius * 6)}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.number, p.x, p.y);
        ctx.restore();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const cdx = p.x - other.x;
          const cdy = p.y - other.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < CONNECTION_DIST) {
            const lineAlpha = (1 - cdist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(79, 70, 229, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Mark title animation as done after typewriter finishes
  useEffect(() => {
    const timer = setTimeout(() => setTitleDone(true), titleText.length * 60 + 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleModeSwitch = (newMode) => {
    playClick();
    setMode(newMode);
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden mesh-bg vignette">
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Ambient glow orbs (using radial gradients instead of expensive CSS blur filters) */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full animate-float pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(79, 70, 229, 0.12) 0%, transparent 60%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full animate-float-slow pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 60%)' }} />
      <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] rounded-full animate-float pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%)' }} />

      <motion.div
        className="glass-panel z-10 flex flex-col items-center max-w-xl w-full text-center px-8 py-12 md:px-12"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* ── Typewriter Title ────────────────────── */}
        <div className="mb-2">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-space font-bold text-white leading-tight flex flex-wrap justify-center gap-x-[0.3em] gap-y-2"
            initial="hidden"
            animate="visible"
          >
            {titleText.split(' ').map((word, wordIndex, arr) => {
              const previousCharsCount = arr.slice(0, wordIndex).reduce((sum, w) => sum + w.length + 1, 0);
              return (
                <span key={wordIndex} className="inline-block whitespace-nowrap">
                  {word.split('').map((char, charIndex) => (
                    <motion.span
                      key={charIndex}
                      custom={previousCharsCount + charIndex}
                      variants={letterVariants}
                      className="inline-block neon-text-primary"
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              );
            })}
          </motion.h1>

          {/* Blinking cursor */}
          <motion.span
            className="inline-block w-[3px] h-8 md:h-10 bg-brand-primary ml-1 align-middle"
            animate={titleDone ? { opacity: [1, 0] } : { opacity: 1 }}
            transition={titleDone ? { duration: 0.6, repeat: 4, repeatType: 'reverse' } : {}}
            style={{ display: titleDone ? 'none' : undefined }}
          />
        </div>

        <motion.p
          className="text-gray-400 font-inter text-sm md:text-base mb-8 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          Real-time multiplayer number guessing
        </motion.p>

        {/* ── Mode Panels ────────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 w-full mt-4"
            >
              <motion.button
                className="primary-btn text-lg py-4 font-space"
                onClick={() => handleModeSwitch('create')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ✨ Create New Room
              </motion.button>
              <motion.button
                className="gradient-border rounded-xl py-4 px-8 text-white font-space font-bold text-lg bg-dark-surface/50 hover:bg-dark-elevated/60 transition-colors"
                onClick={() => handleModeSwitch('join')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🚀 Join Existing Room
              </motion.button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col gap-4 w-full mt-4"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Your nickname..."
                  className="input-field text-center text-lg font-space py-4"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoFocus
                  maxLength={16}
                />
                {nickname && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-accent text-lg"
                  >
                    ✓
                  </motion.div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <motion.button
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all font-space font-medium"
                  onClick={() => handleModeSwitch('menu')}
                  whileTap={{ scale: 0.97 }}
                >
                  ← Back
                </motion.button>
                <motion.button
                  className="primary-btn flex-1 py-3.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => nickname && onCreateRoom(nickname)}
                  disabled={!nickname}
                  whileHover={nickname ? { scale: 1.02 } : {}}
                  whileTap={nickname ? { scale: 0.98 } : {}}
                >
                  Create Room
                </motion.button>
              </div>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col gap-4 w-full mt-4"
            >
              <input
                type="text"
                placeholder="Your nickname..."
                className="input-field text-center text-lg font-space py-4"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
                maxLength={16}
              />
              <input
                type="text"
                placeholder="Room Code (e.g. ABCD)"
                className="input-field text-center text-xl uppercase tracking-[0.3em] font-space font-bold py-4"
                value={roomId}
                maxLength={4}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              />
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <motion.button
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all font-space font-medium"
                  onClick={() => handleModeSwitch('menu')}
                  whileTap={{ scale: 0.97 }}
                >
                  ← Back
                </motion.button>
                <motion.button
                  className="primary-btn flex-1 py-3.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={() => nickname && roomId.length === 4 && onJoinRoom(nickname, roomId)}
                  disabled={!nickname || roomId.length !== 4}
                  whileHover={nickname && roomId.length === 4 ? { scale: 1.02 } : {}}
                  whileTap={nickname && roomId.length === 4 ? { scale: 0.98 } : {}}
                >
                  Join Room
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
