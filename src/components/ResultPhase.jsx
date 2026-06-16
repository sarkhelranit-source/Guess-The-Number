import { motion } from 'framer-motion';

export default function ResultPhase({ winner, myNickname, onBackToLobby }) {
  const isWinner = winner === myNickname;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        className="glass-panel w-full max-w-2xl text-center py-16"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
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
          </p>

          <button onClick={onBackToLobby} className="primary-btn py-4 px-12 text-lg">
            Back to Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
