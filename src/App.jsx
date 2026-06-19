import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import GamePhase from './components/GamePhase';
import ResultPhase from './components/ResultPhase';
import { wsService } from './services/websocket';
import DOMPurify from 'dompurify';

const WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL) {
  console.error("CRITICAL: VITE_WS_URL is not defined in environment variables!");
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: 'red', color: 'white', minHeight: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [phase, setPhase] = useState('landing'); // landing, lobby, playing, result
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [winner, setWinner] = useState('');
  const [lastHint, setLastHint] = useState('');
  const [selectedMode, setSelectedMode] = useState(''); // track mode selected by host
  const [toastMessage, setToastMessage] = useState('');
  const [roundResults, setRoundResults] = useState(null);
  const [lastTarget, setLastTarget] = useState(null);

  // Use a ref to track phase inside callbacks to avoid stale closures
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const isHost = gameState?.players?.[0]?.name === nickname;

  // Subscribe to WebSocket events ONCE on mount — no [phase] dependency
  useEffect(() => {
    const unsubCreated = wsService.on('roomCreated', (data) => {
      setRoomId(data.room.roomId);
      setGameState(data.room);
      setPhase('lobby');
      setError('');
    });

    const unsubJoined = wsService.on('playerJoined', (data) => {
      setRoomId(data.room.roomId);
      setGameState(data.room);
      // Use ref to read current phase without stale closure
      if (phaseRef.current === 'landing') setPhase('lobby');
      setError('');
    });

    const unsubStarted = wsService.on('gameStarted', (data) => {
      console.log('[App] gameStarted received', data);
      setGameState(data.room);
      setPhase('playing');
    });

    const unsubUpdated = wsService.on('gameUpdated', (data) => {
      setGameState(data.room);
    });

    const unsubHint = wsService.on('guessResult', (data) => {
      if (data.hintType === 'temperature') {
        setLastHint(data.hint);
      } else {
        setLastHint(`Try something ${data.hint}!`);
      }
    });

    const unsubOver = wsService.on('gameOver', (data) => {
      setWinner(DOMPurify.sanitize(data.winner));
      setLastTarget(data.target);
      if (data.delay) {
        setTimeout(() => setPhase('result'), data.delay);
      } else {
        setPhase('result');
      }
    });

    const unsubRematch = wsService.on('rematchRequested', (data) => {
      setToastMessage(`${DOMPurify.sanitize(data.playerName)} wants a rematch!`);
      setTimeout(() => setToastMessage(''), 3000);
    });

    const unsubReturnedToLobby = wsService.on('returnedToLobby', (data) => {
      setGameState(data.room);
      setPhase('lobby');
    });

    const unsubPlayerLeft = wsService.on('playerLeft', (data) => {
      setGameState(data.room);
      setToastMessage(`${DOMPurify.sanitize(data.leftPlayer)} left the room.`);
      setTimeout(() => setToastMessage(''), 3000);
    });

    const unsubRoundEnded = wsService.on('roundEnded', (data) => {
      setGameState(data.room);
      setRoundResults(data.roundResults);
      setTimeout(() => {
        setRoundResults(null);
      }, 5000);
    });

    const unsubError = wsService.on('error', (data) => {
      setError(data.message);
    });

    return () => {
      unsubCreated();
      unsubJoined();
      unsubStarted();
      unsubUpdated();
      unsubHint();
      unsubOver();
      unsubRematch();
      unsubReturnedToLobby();
      unsubPlayerLeft();
      unsubRoundEnded();
      unsubError();
    };
  }, []); // <-- Empty dependency: subscribe once, unsubscribe on unmount

  const connectAndJoin = (name, action, roomCode = null) => {
    setNickname(name);
    wsService.connect(
      WS_URL,
      () => {
        if (action === 'createRoom') {
          wsService.send({ action: 'createRoom', playerName: name, gameMode: 'race' });
        } else {
          wsService.send({ action: 'joinRoom', roomId: roomCode, playerName: name });
        }
      },
      (err) => setError('Failed to connect to server. Check your WebSocket URL!'),
      () => {
        // Use ref for current phase
        if (phaseRef.current !== 'landing') {
          setError('Disconnected from server.');
          setPhase('landing');
        }
      }
    );
  };

  const handleCreateRoom = (name) => connectAndJoin(name, 'createRoom');
  const handleJoinRoom = (name, code) => connectAndJoin(name, 'joinRoom', code);

  const handleSetGameMode = (mode) => {
    setSelectedMode(mode);
  };

  const handleStartGame = () => {
    wsService.send({ action: 'startGame', roomId, gameMode: selectedMode || gameState.gameMode });
  };

  const handleLeaveRoom = () => {
    wsService.disconnect();
    setPhase('landing');
    setGameState(null);
  };

  const handleBackToRoom = () => {
    if (isHost) {
      wsService.send({ action: 'returnToLobby', roomId });
    } else {
      setPhase('lobby');
    }
  };

  const handlePlayAgain = () => {
    if (isHost) {
      handleStartGame();
    } else {
      wsService.send({ action: 'rematchRequest', roomId, playerName: nickname });
    }
  };

  const handleGuess = (guess) => {
    setLastHint(''); // reset hint while waiting for server response
    wsService.send({ action: 'guess', roomId, guess: guess.toString() });
  };

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen mesh-bg text-white overflow-hidden font-inter">
      {/* ── Error Toast ────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/15 backdrop-blur-md border border-red-500/30 text-red-300 px-6 py-3 rounded-xl shadow-2xl font-space font-bold flex items-center gap-3"
          >
            <span className="text-red-400">⚠</span>
            {error}
            <button
              onClick={() => setError('')}
              className="ml-2 opacity-50 hover:opacity-100 font-bold text-lg transition-opacity"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info Toast ─────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-brand-primary/15 backdrop-blur-md border border-brand-primary/30 text-white px-6 py-3 rounded-xl shadow-2xl font-space font-bold flex items-center gap-3"
          >
            <span className="text-brand-primary">ℹ</span>
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase Router ───────────────────────────── */}
      <AnimatePresence>
        {phase === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
            <LandingPage onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
          </motion.div>
        )}
        
        {phase === 'lobby' && gameState && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
            <Lobby 
              players={gameState.players.map(p => DOMPurify.sanitize(p.name))} 
              roomId={roomId} 
              isHost={isHost} 
              gameMode={gameState.gameMode} 
              setGameMode={handleSetGameMode}
              onStartGame={handleStartGame} 
              onLeave={handleLeaveRoom}
            />
          </motion.div>
        )}
        
        {phase === 'playing' && gameState && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
            <GamePhase 
              gameState={gameState} 
              myNickname={nickname} 
              onGuess={handleGuess}
              lastHint={lastHint}
              roundResults={roundResults}
            />
          </motion.div>
        )}
        
        {phase === 'result' && gameState && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
            <ResultPhase 
              winner={winner}
              myNickname={nickname}
              isHost={isHost}
              onPlayAgain={handlePlayAgain}
              onBackToRoom={handleBackToRoom}
              target={lastTarget}
              gameMode={gameState.gameMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

export default App;
