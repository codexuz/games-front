import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GameScreens.css';

// ── Shared types ─────────────────────────────────────────────────────────────
export interface QuestionData {
  index: number;
  total: number;
  text: string;
  options: string[];
  timeLimit: number;
  role: 'host' | 'player';
  onAnswer?: (index: number) => void;
  playerName?: string;
  currentScore?: number;
}

export interface ResultData {
  correctIndex: number;
  options: string[];
  leaderboard: { name: string; score: number; correct: boolean; points: number }[];
  playerName?: string;
  isLast: boolean;
}

export interface EndData {
  leaderboard: { name: string; score: number }[];
  playerName?: string;
  onPlayAgain?: () => void;
  onHome: () => void;
}

const BTN_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
const BTN_SHADOW = ['#9b1228', '#0d4694', '#9a6f00', '#166006'];
const BTN_SHAPES = ['▲', '◆', '●', '■'];
const MEDALS = ['🥇', '🥈', '🥉'];

// ── Decorative blobs ─────────────────────────────────────────────────────────
function Blobs() {
  const blobs = Array.from({ length: 6 }, (_, i) => ({
    left: `${(i * 17 + 5) % 100}%`,
    top: `${(i * 23 + 10) % 100}%`,
    size: 80 + (i * 37) % 160,
  }));
  return (
    <div className="gs-blobs" aria-hidden>
      {blobs.map((b, i) => (
        <div key={i} className="gs-blob" style={{ left: b.left, top: b.top, width: b.size, height: b.size }} />
      ))}
    </div>
  );
}

// ── Idle / waiting screen ─────────────────────────────────────────────────────
export function IdleScreen() {
  return (
    <div className="gs-screen gs-dark-bg">
      <div className="gs-idle-content">
        <motion.div
          className="gs-idle-spinner"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        />
        <motion.p
          className="gs-idle-text"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          Waiting for the game to start...
        </motion.p>
      </div>
    </div>
  );
}

// ── Question screen ───────────────────────────────────────────────────────────
export function QuestionScreen({ data, onAnswer }: { data: QuestionData; onAnswer?: (i: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(data.timeLimit);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveOnAnswer = onAnswer ?? data.onAnswer;
  const onAnswerRef = useRef(effectiveOnAnswer);
  const selectedRef = useRef<number | null>(null);
  onAnswerRef.current = effectiveOnAnswer;

  const secs = Math.ceil(timeLeft / 1000);

  // Play music for host only
  useEffect(() => {
    if (data.role !== 'host') return;
    const audio = new Audio('/sounds/question.ogg');
    audio.loop = true;
    audio.volume = 0.4;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, [data.role]);

  // Countdown — auto-submit when time runs out
  useEffect(() => {
    if (answered) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        const next = Math.max(0, t - 100);
        if (next <= 0) {
          clearInterval(id);
          setAnswered(true);
          onAnswerRef.current?.(selectedRef.current ?? -1);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [answered]);

  function handleSelect(idx: number) {
    if (answered) return;
    selectedRef.current = idx;
    setSelected(idx);
    setAnswered(true);
    audioRef.current?.pause();
    onAnswerRef.current?.(idx);
  }

  return (
    <div className="gs-screen gs-dark-bg">
      {/* Top bar */}
      <div className="gs-topbar-custom">
        <div className="gs-top-left">
          <div className="gs-q-circle">{data.index + 1}</div>
        </div>
        <div className="gs-top-right" />
      </div>

      <div className="gs-main-layout">
        {/* Media area with timer */}
        <div className="gs-media-section">
          <div className="gs-timer-circle">
            <span className="gs-timer-text">{secs}</span>
          </div>
        </div>

        {/* Question and options */}
        <div className="gs-question-section">
          <div className="gs-question-block">
            <p className="gs-question-text">{data.text}</p>
          </div>

          {data.role === 'player' ? (
            <div className="gs-options-grid">
              {data.options.map((opt, i) => (
                <button
                  key={i}
                  className={`gs-option-card ${selected === i ? 'selected' : ''}`}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                >
                  <div className="gs-option-radio">
                    {selected === i && <div className="gs-option-radio-inner" />}
                  </div>
                  <span className="gs-option-text">{opt}</span>
                </button>
              ))}
            </div>
          ) : (
            <HostQuestionView options={data.options} />
          )}
        </div>
      </div>

      {/* Footer */}
      {data.role === 'player' && data.playerName && (
        <div className="gs-footer-custom">
          <div className="gs-player-info">
            <div className="gs-player-avatar">🦊</div>
            <div className="gs-player-details">
              <span className="gs-player-name">{data.playerName}</span>
              <span className="gs-player-score">{data.currentScore ?? 0} pts</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function HostQuestionView({ options }: { options: string[] }) {
  return (
    <div className="gs-host-view">
      <motion.div 
        className="gs-host-spinner" 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }} 
      />
      <p className="gs-host-label">Waiting for players to answer...</p>
      <div className="gs-host-options-grid">
        {options.map((opt, i) => (
          <motion.div
            key={i}
            className="gs-host-option-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className="gs-btn-shape" style={{ color: BTN_COLORS[i] }}>{BTN_SHAPES[i]}</span>
            <span className="gs-host-opt-text">{opt}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────
export function ResultScreen({ data }: { data: ResultData }) {
  const me = data.leaderboard.find(p => p.name === data.playerName);
  const isPlayer = !!data.playerName;

  return (
    <div className="gs-screen gs-dark-bg">
      <div className="gs-topbar-custom">
        <div className="gs-top-left"></div>
        <span className="gs-result-title">Results</span>
        <div className="gs-top-right"></div>
      </div>

      <div className="gs-main-layout">
        {isPlayer && me && (
          <motion.div
            className={`gs-player-result-banner ${me.correct ? 'correct' : 'wrong'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <div className="gs-banner-icon">{me.correct ? '✓' : '✗'}</div>
            <div className="gs-banner-text">
              <h2>{me.correct ? 'Correct!' : 'Incorrect'}</h2>
              <p>{me.correct ? `+${me.points} points` : '0 points'}</p>
            </div>
          </motion.div>
        )}

        <div className="gs-result-answers-grid">
          {data.options.map((opt, i) => {
            const isCorrect = i === data.correctIndex;
            return (
              <motion.div
                key={i}
                className={`gs-result-ans-card ${isCorrect ? 'correct' : 'wrong'}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="gs-ans-left">
                  <span className="gs-btn-shape" style={{ color: BTN_COLORS[i] }}>{BTN_SHAPES[i]}</span>
                  <span className="gs-ans-text">{opt}</span>
                </div>
                {isCorrect && <span className="gs-ans-check">✓ Correct</span>}
              </motion.div>
            );
          })}
        </div>
      </div>

      {isPlayer && me && (
        <div className="gs-footer-custom">
          <div className="gs-player-info">
            <div className="gs-player-avatar">🦊</div>
            <div className="gs-player-details">
              <span className="gs-player-name">{data.playerName}</span>
              <span className="gs-player-score">{me.score} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Next label */}
      <motion.p
        className="gs-next-label-modern"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        {data.isLast ? 'Final results coming up…' : 'Next question in 5s…'}
      </motion.p>
    </div>
  );
}

// ── End screen ────────────────────────────────────────────────────────────────
export function EndScreen({ data }: { data: EndData }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const top3 = data.leaderboard.slice(0, 3);
  const rest = data.leaderboard.slice(3);
  const podiumOrder = [1, 0, 2]; // centre=1st, left=2nd, right=3rd

  // End sound for host only
  useEffect(() => {
    if (!data.onPlayAgain) return;
    const audio = new Audio('/sounds/end_sound.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, [data.onPlayAgain]);

  return (
    <div className="gs-screen gs-end-bg gs-end">
      <SunRays />

      <div className="gs-end-header-container">
        <div className="gs-end-title-box">Podium</div>
      </div>

      <div className="gs-end-scroll-container">
        <div className="gs-podium-container">
          {podiumOrder.map((lbIdx, slotIdx) => {
            const entry = top3[lbIdx];
            if (!entry) return <div key={slotIdx} className="gs-podium-empty" />;
            const isMe = entry.name === data.playerName;
            return (
              <div key={slotIdx} className={`gs-podium-col gs-podium-rank-${lbIdx + 1} ${isMe ? 'me' : ''}`}>
                <motion.div 
                  className="gs-podium-avatar-wrapper"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + slotIdx * 0.2 }}
                >
                  {lbIdx === 0 && <div className="gs-podium-crown">👑</div>}
                  <div className={`gs-podium-avatar color-${lbIdx}`}>
                    🦊
                  </div>
                </motion.div>
                <motion.div
                  className="gs-podium-bar"
                  initial={{ height: 0 }}
                  animate={{ height: `${100 - lbIdx * 15}%` }}
                  transition={{ duration: 1, type: 'spring', delay: slotIdx * 0.2 }}
                >
                  <div className="gs-podium-rank-shape">
                    <span>{lbIdx + 1}</span>
                  </div>
                  <span className="gs-podium-name">{entry.name}</span>
                  <span className="gs-podium-score">{entry.score}</span>
                </motion.div>
              </div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <div className="gs-runners-up-section">
            <div className="gs-runners-up-title">Runners-up</div>
            <div className="gs-runners-up-list">
              {rest.slice(0, 2).map((p, i) => {
                const isMe = p.name === data.playerName;
                return (
                  <motion.div 
                    key={i} 
                    className={`gs-runner-up-item ${isMe ? 'me' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.05 }}
                  >
                    <span className="gs-ru-rank">{i + 4}</span>
                    <span className="gs-ru-avatar">🦊</span>
                    <span className="gs-ru-name">{p.name}</span>
                    <span className="gs-ru-score">{p.score}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="gs-end-actions">
        {data.onPlayAgain && (
          <button className="gs-end-btn gs-end-primary" onClick={data.onPlayAgain}>
            Play Again
          </button>
        )}
        <button className="gs-end-btn gs-end-secondary" onClick={data.onHome}>
          Home
        </button>
      </div>
    </div>
  );
}

function SunRays() {
  return (
    <div className="gs-sun-rays-container" aria-hidden>
      <motion.div 
        className="gs-sun-rays"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
      />
    </div>
  );
}

// ── Game controller: manages which screen shows ───────────────────────────────
type GameView =
  | { type: 'idle' }
  | { type: 'question'; data: QuestionData }
  | { type: 'result'; data: ResultData }
  | { type: 'end'; data: EndData };

interface GameControllerProps {
  view: GameView;
  onAnswer?: (idx: number) => void;
}

export function GameController({ view, onAnswer }: GameControllerProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view.type + (view.type === 'question' ? view.data.index : '')}
        className="gs-controller"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {view.type === 'idle' && <IdleScreen />}
        {view.type === 'question' && <QuestionScreen data={view.data} onAnswer={onAnswer} />}
        {view.type === 'result' && <ResultScreen data={view.data} />}
        {view.type === 'end' && <EndScreen data={view.data} />}
      </motion.div>
    </AnimatePresence>
  );
}

export type { GameView };
