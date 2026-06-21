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

  const [sessionId, setSessionId] = useState('');
  const sessionIdRef = useRef('');
  const nicknameRef = useRef('');

  // Use refs to track state inside callbacks to avoid stale closures
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);

  const isHost = gameState?.players?.[0]?.name === nickname;

  // Session recovery on mount
  useEffect(() => {
    const sessionStr = sessionStorage.getItem('gtn_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.sessionId && session.roomId && session.nickname) {
          setNickname(session.nickname);
          setRoomId(session.roomId);
          setSessionId(session.sessionId);
          
          wsService.connect(
            WS_URL,
            () => {
              wsService.send({ 
                action: 'reconnect', 
                roomId: session.roomId, 
                sessionId: session.sessionId 
              });
            },
            (err) => {
              console.error('Reconnect failed', err);
              sessionStorage.removeItem('gtn_session');
            },
            () => {
              if (phaseRef.current !== 'landing') {
                setError('Disconnected from server.');
                setPhase('landing');
              }
            }
          );
        }
      } catch (e) {
        sessionStorage.removeItem('gtn_session');
      }
    }
  }, []);

  // Subscribe to WebSocket events ONCE on mount
  useEffect(() => {
    const unsubCreated = wsService.on('roomCreated', (data) => {
      setRoomId(data.room.roomId);
      setGameState(data.room);
      setPhase('lobby');
      setError('');
      if (sessionIdRef.current && nicknameRef.current) {
        sessionStorage.setItem('gtn_session', JSON.stringify({
          sessionId: sessionIdRef.current,
          roomId: data.room.roomId,
          nickname: nicknameRef.current
        }));
      }
    });

    const unsubJoined = wsService.on('playerJoined', (data) => {
      setRoomId(data.room.roomId);
      setGameState(data.room);
      if (phaseRef.current === 'landing') setPhase('lobby');
      setError('');
      if (sessionIdRef.current && nicknameRef.current) {
        sessionStorage.setItem('gtn_session', JSON.stringify({
          sessionId: sessionIdRef.current,
          roomId: data.room.roomId,
          nickname: nicknameRef.current
        }));
      }
    });

    const unsubStarted = wsService.on('gameStarted', (data) => {
      console.log('[App] gameStarted received', data);
      setGameState(data.room);
      setPhase('playing');
    });

    const unsubUpdated = wsService.on('gameUpdated', (data) => {
      setGameState(prev => {
        if (prev && prev.players) {
          const newlyDisconnected = data.room.players.find(p => 
            p.isDisconnected && !prev.players.find(oldP => oldP.name === p.name)?.isDisconnected
          );
          if (newlyDisconnected) {
            setToastMessage(`${DOMPurify.sanitize(newlyDisconnected.name)} left the game.`);
            setTimeout(() => setToastMessage(''), 3000);
          }
        }
        return data.room;
      });
      if (data.room.status === 'finished') {
        if (data.room.winner) setWinner(DOMPurify.sanitize(data.room.winner));
        const target = data.room.gameMode === 'elimination' ? data.room.roundTarget : data.room.players?.[0]?.target;
        if (target !== undefined && target !== null) setLastTarget(target);
      }

      // If we are currently on landing (just reconnected), put us in correct phase
      if (phaseRef.current === 'landing') {
        if (data.room.status === 'playing') setPhase('playing');
        else if (data.room.status === 'waiting') setPhase('lobby');
        else if (data.room.status === 'finished') setPhase('result');
      }
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
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setSessionId(newSessionId);
    setNickname(name);
    wsService.connect(
      WS_URL,
      () => {
        if (action === 'createRoom') {
          wsService.send({ action: 'createRoom', playerName: name, gameMode: 'race', sessionId: newSessionId });
        } else {
          wsService.send({ action: 'joinRoom', roomId: roomCode, playerName: name, sessionId: newSessionId });
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
    sessionStorage.removeItem('gtn_session');
    setSessionId('');
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
      <div className="relative min-h-screen mesh-bg text-white overflow-x-hidden overflow-y-auto font-inter">
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
              players={gameState.players.map(p => ({
                name: DOMPurify.sanitize(p.name),
                isDisconnected: p.isDisconnected
              }))} 
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
              onLeave={handleLeaveRoom}
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
