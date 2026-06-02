import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { GameController, type GameView } from '../components/GameScreens';
import './GamePage.css';

type Phase = 'join' | 'lobby' | 'playing';

export default function JoinPage() {
  const nav = useNavigate();
  const socket = useSocket();

  const [phase, setPhase] = useState<Phase>('join');
  const [joinStep, setJoinStep] = useState(1);
  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [players, setPlayers] = useState<{ name: string; score: number }[]>([]);
  const [gameView, setGameView] = useState<GameView>({ type: 'idle' });

  const codeRef = useRef('');
  const nameRef = useRef('');
  const scoreRef = useRef(0);

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { nameRef.current = playerName; }, [playerName]);

  useEffect(() => {
    const onJoined = (data: any) => { setRoomInfo(data); setPhase('lobby'); };
    const onPlayers = ({ players }: any) => setPlayers(players);

    const onQuestion = (data: any) => {
      setGameView({
        type: 'question',
        data: {
          index: data.index,
          total: data.total,
          text: data.text,
          type: data.type || 'multiple_choice',
          questionData: data.questionData || {},
          timeLimit: data.timeLimit,
          points: data.points || 1000,
          imageUrl: data.imageUrl || null,
          role: 'player' as const,
          playerName: nameRef.current,
          currentScore: scoreRef.current,
          onAnswer: (answer: any) => {
            socket.emit('player:answer', { code: codeRef.current, answer });
          },
        },
      });
      setPhase('playing');
    };

    const onAck = ({ totalScore }: any) => { scoreRef.current = totalScore; };

    const onResult = (data: any) => {
      setGameView({
        type: 'result',
        data: {
          type: data.type || 'multiple_choice',
          questionData: data.questionData || {},
          leaderboard: data.leaderboard,
          playerName: nameRef.current,
          isLast: data.isLast,
          pollResults: data.pollResults,
        },
      });
    };

    const onEnded = ({ leaderboard, reason }: any) => {
      if (reason === 'complete') {
        setGameView({
          type: 'end',
          data: { leaderboard, playerName: nameRef.current, onHome: () => nav('/') },
        });
      } else {
        alert('Game ended: host disconnected.');
        nav('/');
      }
    };

    const onError = (msg: string) => alert(msg);

    socket.on('player:joined',      onJoined);
    socket.on('room:players',       onPlayers);
    socket.on('game:question',      onQuestion);
    socket.on('player:answer_ack',  onAck);
    socket.on('game:result',        onResult);
    socket.on('game:ended',         onEnded);
    socket.on('error',              onError);

    return () => {
      socket.off('player:joined',     onJoined);
      socket.off('room:players',      onPlayers);
      socket.off('game:question',     onQuestion);
      socket.off('player:answer_ack', onAck);
      socket.off('game:result',       onResult);
      socket.off('game:ended',        onEnded);
      socket.off('error',             onError);
    };
  }, [socket]);

  function joinRoom() {
    if (!playerName.trim()) return alert('Enter your name');
    if (!code.trim()) return alert('Enter a room code');
    socket.emit('player:join', { code: code.toUpperCase().trim(), playerName: playerName.trim() });
  }

  // ── Join form ─────────────────────────────────────────────────────────────
  if (phase === 'join') {
    if (joinStep === 1) return (
      <div className="game-page join-page-purple">
        <div className="join-box">
          <h1 className="kahoot-logo" style={{ fontSize: '36px' }}>Join Game</h1>
          <div className="join-card">
            <input
              className="input-field pin-input"
              placeholder="Game PIN"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              onKeyDown={e => { if (e.key === 'Enter' && code.trim()) setJoinStep(2); }}
            />
            <button className="btn-dark" onClick={() => { if (code.trim()) setJoinStep(2); }}>Enter</button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="game-page join-page-dark">
        <div className="join-box">
          <div className="join-card">
            <input
              className="input-field"
              placeholder="Nickname"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              autoFocus
            />
            <button className="btn-dark" onClick={joinRoom}>OK, go!</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="game-page">
      <div className="lobby-container">
        <div className="room-code-display">
          <div className="room-code-label">Room</div>
          <div className="room-code-value">{code}</div>
        </div>
        <div className="quiz-info">
          <span className="quiz-badge">📋 {roomInfo?.quiz?.title}</span>
          <span className="quiz-count">{roomInfo?.quiz?.questionCount} questions</span>
        </div>
        <div className="players-list">
          <h3>Players ({players.length})</h3>
          <div className="players-grid">
            {players.map((p, i) => (
              <div key={i} className={`player-chip ${p.name === playerName ? 'me' : ''}`}>
                <span className="player-avatar">{p.name[0].toUpperCase()}</span>
                {p.name} {p.name === playerName ? '(you)' : ''}
              </div>
            ))}
          </div>
        </div>
        <div className="waiting-hint pulse">⏳ Waiting for host to start…</div>
      </div>
    </div>
  );

  // ── Playing ───────────────────────────────────────────────────────────────
  return (
    <div className="game-page game-playing">
      <div className="phaser-wrapper">
        <GameController view={gameView} />
      </div>
    </div>
  );
}
