import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Share2, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { GameController, type GameView } from '../components/GameScreens';
import './GamePage.css';

const API = import.meta.env.VITE_API_URL;

type Phase = 'setup' | 'lobby' | 'playing' | 'ended';

interface Quiz {
  id: string;
  title: string;
  category?: string;
  teacherId?: string;
  type?: 'public' | 'private';
  questions: { id: string; text: string; type: string; questionData: any; timeLimit: number; points: number }[];
}

export default function HostPage() {
  const nav = useNavigate();
  const socket = useSocket();
  const { teacher, token } = useAuth();

  const [phase, setPhase] = useState<Phase>('setup');
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [teacherQuizzes, setTeacherQuizzes] = useState<Quiz[]>([]);
  const [teacherHasMore, setTeacherHasMore] = useState(false);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherLoadingMore, setTeacherLoadingMore] = useState(false);

  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  const [publicHasMore, setPublicHasMore] = useState(false);
  const [publicPage, setPublicPage] = useState(1);
  const [publicLoadingMore, setPublicLoadingMore] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [hostName, setHostName] = useState(() => teacher?.name || '');
  const [players, setPlayers] = useState<{ name: string; avatar?: string; score: number }[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const [gameView, setGameView] = useState<GameView>({ type: 'idle' });

  const lobbyAudio = useRef<HTMLAudioElement | null>(null);
  const modalQrRef = useRef<HTMLCanvasElement | null>(null);

  const roomCodeRef = useRef('');

  // Lobby audio
  useEffect(() => {
    if (phase === 'lobby') {
      const audio = new Audio('/sounds/lobby_sound.mp3');
      audio.loop = true; audio.volume = 0.5; audio.muted = muted;
      audio.play().catch(() => {});
      lobbyAudio.current = audio;
    } else {
      lobbyAudio.current?.pause();
      lobbyAudio.current = null;
    }
    return () => {
      if (lobbyAudio.current) {
        lobbyAudio.current.pause();
      }
    };
  }, [phase, muted]);

  // QR code
  useEffect(() => {
    if (showShare && roomCode && modalQrRef.current) {
      QRCode.toCanvas(modalQrRef.current, `${window.location.origin}/join?code=${roomCode}`, { width: 200, margin: 2 });
    }
  }, [showShare, roomCode]);

  function toggleMute() {
    setMuted(m => {
      const next = !m;
      if (lobbyAudio.current) lobbyAudio.current.muted = next;
      return next;
    });
  }

  function copyJoinUrl() {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${roomCode}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Socket connection
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, [socket]);


  useEffect(() => {
    fetchPublic(1, false);
  }, []);

  useEffect(() => {
    if (!teacher || !token) { setTeacherQuizzes([]); return; }
    fetchTeacher(1, false);
  }, [teacher, token]);

  async function fetchPublic(page: number, append: boolean) {
    if (append) setPublicLoadingMore(true);
    try {
      const r = await fetch(`${API}/quizzes?page=${page}&limit=12`);
      const data = await r.json();
      const list: Quiz[] = Array.isArray(data.quizzes) ? data.quizzes : [];
      setPublicQuizzes(prev => append ? [...prev, ...list] : list);
      setPublicHasMore(data.pagination?.hasMore ?? false);
      setPublicPage(page);
    } catch { if (!append) setPublicQuizzes([]); }
    finally { if (append) setPublicLoadingMore(false); }
  }

  async function fetchTeacher(page: number, append: boolean) {
    if (append) setTeacherLoadingMore(true);
    try {
      const r = await fetch(`${API}/teacher/quizzes/mine?page=${page}&limit=12`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      const list: Quiz[] = Array.isArray(data.quizzes) ? data.quizzes : [];
      setTeacherQuizzes(prev => append ? [...prev, ...list] : list);
      setTeacherHasMore(data.pagination?.hasMore ?? false);
      setTeacherPage(page);
    } catch { if (!append) setTeacherQuizzes([]); }
    finally { if (append) setTeacherLoadingMore(false); }
  }

  useEffect(() => { if (teacher?.name) setHostName(teacher.name); }, [teacher]);

  // Game events
  useEffect(() => {
    const onCreated = ({ code }: any) => {
      setRoomCode(code); roomCodeRef.current = code; setPhase('lobby');
    };
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
          role: 'host' as const,
        },
      });
      setPhase('playing');
    };

    const onResult = (data: any) => {
      setGameView({
        type: 'result',
        data: {
          type: data.type || 'multiple_choice',
          questionData: data.questionData || {},
          leaderboard: data.leaderboard,
          isLast: data.isLast,
          pollResults: data.pollResults,
        },
      });
    };

    const onEnded = ({ leaderboard, reason }: any) => {
      if (reason === 'complete') {
        setGameView({
          type: 'end',
          data: {
            leaderboard,
            onPlayAgain: () => { setPlayers([]); setRoomCode(''); setGameView({ type: 'idle' }); setPhase('setup'); },
            onHome: () => nav('/'),
          },
        });
      }
      setPhase('ended');
    };

    const onError = (msg: string) => alert(msg);

    socket.on('host:created',  onCreated);
    socket.on('room:players',  onPlayers);
    socket.on('game:question', onQuestion);
    socket.on('game:result',   onResult);
    socket.on('game:ended',    onEnded);
    socket.on('error',         onError);

    return () => {
      socket.off('host:created',  onCreated);
      socket.off('room:players',  onPlayers);
      socket.off('game:question', onQuestion);
      socket.off('game:result',   onResult);
      socket.off('game:ended',    onEnded);
      socket.off('error',         onError);
    };
  }, [socket]);

  function createRoom(quizId: string) {
    if (!hostName.trim()) return alert('Enter your name first');
    if (!socket.connected) return alert('Not connected to server.');
    socket.emit('host:create', { quizId, hostName: hostName.trim() });
  }

  function startGame() {
    socket.emit('host:start', { code: roomCodeRef.current });
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="game-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => nav('/')}>← Back</button>
        <h2>🎓 Host a Game</h2>
        <span className={`conn-dot ${connected ? 'conn-ok' : 'conn-err'}`}>
          {connected ? '● Online' : '● Offline'}
        </span>
      </div>
      <div className="setup-form">
        <input className="input-field" placeholder="Your name (host)" value={hostName} onChange={e => setHostName(e.target.value)} />
        {teacher ? (
          <>
            {teacherQuizzes.length > 0 && (
              <>
                <div className="quiz-list-header">
                  <h3>My Quizzes</h3>
                  <button className="btn-secondary" onClick={() => nav('/dashboard')}>Manage →</button>
                </div>
                <div className="quiz-grid">
                  {teacherQuizzes.map(q => (
                    <div key={q.id} className="quiz-card teacher-card" onClick={() => createRoom(q.id)}>
                      <div className="quiz-emoji">✏️</div>
                      <div className="quiz-title">{q.title}</div>
                      <div className="quiz-meta">{q.questions.length} questions</div>
                      <div className="quiz-start-hint">Click to host →</div>
                    </div>
                  ))}
                </div>
                {teacherHasMore && (
                  <div className="quiz-load-more-row">
                    <button className="quiz-load-more-btn" disabled={teacherLoadingMore} onClick={() => fetchTeacher(teacherPage + 1, true)}>
                      {teacherLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
            {/* Public quizzes from other teachers */}
            {publicQuizzes.filter(q => q.teacherId !== teacher.id).length > 0 && (
              <>
                <div className="quiz-list-header" style={{ marginTop: teacherQuizzes.length > 0 ? 24 : 0 }}>
                  <h3>🌐 Public Quizzes</h3>
                </div>
                <div className="quiz-grid">
                  {publicQuizzes.filter(q => q.teacherId !== teacher.id).map(q => (
                    <div key={q.id} className="quiz-card public-card" onClick={() => createRoom(q.id)}>
                      <div className="quiz-emoji">🌐</div>
                      <div className="quiz-title">{q.title}</div>
                      <div className="quiz-meta">{q.questions.length} questions{q.category ? ` · ${q.category}` : ''}</div>
                      <div className="quiz-start-hint">Click to host →</div>
                    </div>
                  ))}
                </div>
                {publicHasMore && (
                  <div className="quiz-load-more-row">
                    <button className="quiz-load-more-btn" disabled={publicLoadingMore} onClick={() => fetchPublic(publicPage + 1, true)}>
                      {publicLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="teacher-cta">
              <span>👩‍🏫 Teacher?</span>
              <button className="btn-secondary" onClick={() => nav('/auth')}>Sign in to use your quizzes</button>
            </div>
            {/* Public quizzes for unauthenticated users too */}
            {publicQuizzes.length > 0 && (
              <>
                <div className="quiz-list-header" style={{ marginTop: 24 }}>
                  <h3>🌐 Public Quizzes</h3>
                </div>
                <div className="quiz-grid">
                  {publicQuizzes.map(q => (
                    <div key={q.id} className="quiz-card public-card" onClick={() => createRoom(q.id)}>
                      <div className="quiz-emoji">🌐</div>
                      <div className="quiz-title">{q.title}</div>
                      <div className="quiz-meta">{q.questions.length} questions{q.category ? ` · ${q.category}` : ''}</div>
                      <div className="quiz-start-hint">Click to host →</div>
                    </div>
                  ))}
                </div>
                {publicHasMore && (
                  <div className="quiz-load-more-row">
                    <button className="quiz-load-more-btn" disabled={publicLoadingMore} onClick={() => fetchPublic(publicPage + 1, true)}>
                      {publicLoadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="game-page host-lobby-dark">
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 20 }}>
        <button className="back-btn" onClick={() => setPhase('setup')}>← Cancel</button>
      </div>
      <div className="host-top-banner">
        <div className="pin-section">
          <div className="pin-label">Game PIN</div>
          <div className="pin-row">
            <div className="pin-value">{roomCode}</div>
            <button className="btn-share-pin" onClick={() => setShowShare(true)} title="Share">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {showShare && (
        <div className="share-modal-overlay" onClick={() => setShowShare(false)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShare(false)}><X size={18} /></button>
            <div className="share-modal-body">
              <canvas ref={modalQrRef} />
              <div className="share-modal-info">
                <div className="share-modal-pin-label">Game PIN</div>
                <div className="share-modal-pin-value">{roomCode}</div>
                <button className="btn-copy-url" onClick={copyJoinUrl}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="players-list-host">
        {players.length === 0 ? (
          <div className="waiting-pill">Waiting for participants</div>
        ) : (
          <div className="players-grid-host">
            {players.map((p, i) => (
              <div key={i} className="player-tile">
                {p.avatar && <img src={`/avatars/${p.avatar}.svg`} alt={p.avatar} className="player-tile-avatar" />}
                <div className="player-name">{p.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn-start-floating" onClick={startGame} disabled={players.length === 0}>Start</button>
      <button className="btn-mute-floating" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
        {muted ? <VolumeX size={20} color="#ffffff" /> : <Volume2 size={20} color="#ffffff" />}
      </button>
    </div>
  );

  // ── Playing / Ended (React game screens) ──────────────────────────────────
  return (
    <div className="game-page game-playing">
      <div className="phaser-wrapper">
        <GameController view={gameView} />
      </div>
    </div>
  );
}
