import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import GamePhase from './components/GamePhase';
import ResultPhase from './components/ResultPhase';
import { wsService } from './services/websocket';

const WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL) {
  console.error("CRITICAL: VITE_WS_URL is not defined in environment variables!");
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

  const isHost = gameState?.players?.[0]?.name === nickname;

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
      if (phase === 'landing') setPhase('lobby');
      setError('');
    });

    const unsubStarted = wsService.on('gameStarted', (data) => {
      setGameState(data.room);
      setPhase('playing');
    });

    const unsubUpdated = wsService.on('gameUpdated', (data) => {
      setGameState(data.room);
    });

    const unsubHint = wsService.on('guessResult', (data) => {
      setLastHint(`Try something ${data.hint}!`);
    });

    const unsubOver = wsService.on('gameOver', (data) => {
      setWinner(data.winner);
      setLastTarget(data.target);
      if (data.delay) {
        setTimeout(() => setPhase('result'), data.delay);
      } else {
        setPhase('result');
      }
    });

    const unsubRematch = wsService.on('rematchRequested', (data) => {
      setToastMessage(`${data.playerName} wants a rematch!`);
      setTimeout(() => setToastMessage(''), 3000);
    });

    const unsubReturnedToLobby = wsService.on('returnedToLobby', (data) => {
      setGameState(data.room);
      setPhase('lobby');
    });

    const unsubPlayerLeft = wsService.on('playerLeft', (data) => {
      setGameState(data.room);
      setToastMessage(`${data.leftPlayer} left the room.`);
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
  }, [phase]);

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
        if (phase !== 'landing') {
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
    <div className="relative min-h-screen bg-dark-bg text-white overflow-hidden">
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg font-bold flex items-center">
          {error}
          <button onClick={() => setError('')} className="ml-4 opacity-50 hover:opacity-100 font-bold text-xl">×</button>
        </div>
      )}

      {toastMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-brand-primary/90 text-white px-6 py-3 rounded-lg shadow-lg font-bold flex items-center"
        >
          {toastMessage}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -50 }} className="absolute inset-0">
            <LandingPage onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
          </motion.div>
        )}
        
        {phase === 'lobby' && gameState && (
          <motion.div key="lobby" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0">
            <Lobby 
              players={gameState.players.map(p => p.name)} 
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
          <motion.div key="playing" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="absolute inset-0">
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
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <ResultPhase 
              winner={winner}
              myNickname={nickname}
              isHost={isHost}
              onPlayAgain={handlePlayAgain}
              onBackToRoom={handleBackToRoom}
              target={lastTarget}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
