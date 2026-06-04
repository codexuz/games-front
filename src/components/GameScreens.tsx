import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import './GameScreens.css';

// ── Animated number that counts up from `from` to `to` ───────────────────────
function CountUp({ from, to, duration = 1, className }: { from: number; to: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(Math.round(from));
  useEffect(() => {
    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: v => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to, duration]);
  return <span className={className}>{display}</span>;
}

// ── Shared types ─────────────────────────────────────────────────────────────
export type QuestionType = 'multiple_choice' | 'true_false' | 'type_answer' | 'slider' | 'poll' | 'ordering';

export interface QuestionData {
  index: number;
  total: number;
  text: string;
  type: QuestionType;
  questionData: Record<string, any>;
  timeLimit: number;
  points: number;
  imageUrl?: string | null;
  role: 'host' | 'player';
  onAnswer?: (answer: any) => void;
  playerName?: string;
  currentScore?: number;
}

export interface ResultData {
  type: QuestionType;
  questionData: Record<string, any>;
  leaderboard: { name: string; score: number; correct: boolean; points: number }[];
  playerName?: string;
  isLast: boolean;
  pollResults?: Record<number, number>;
}

export interface EndData {
  leaderboard: { name: string; score: number }[];
  playerName?: string;
  onPlayAgain?: () => void;
  onHome: () => void;
}

const BTN_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'];
const BTN_SHAPES = ['▲', '◆', '●', '■', '★', '⬟', '⬡', '◈'];

// ── Decorative sun rays ──────────────────────────────────────────────────────
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

// ── Confetti particles ───────────────────────────────────────────────────────
function Confetti() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 3,
    color: BTN_COLORS[i % BTN_COLORS.length],
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
  return (
    <div className="gs-confetti" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="gs-confetti-particle"
          style={{
            left: p.left,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ── Timer ring ───────────────────────────────────────────────────────────────
function TimerRing({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const secs = Math.ceil(timeLeft / 1000);
  const pct = timeLeft / timeLimit;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const urgentClass = pct < 0.25 ? 'urgent' : pct < 0.5 ? 'warning' : '';

  return (
    <div className={`gs-small-timer ${urgentClass}`}>
      <svg viewBox="0 0 48 48" className="gs-small-timer-svg">
        <circle className="gs-timer-track" cx="24" cy="24" r={radius} />
        <circle
          className="gs-timer-progress"
          cx="24" cy="24" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="gs-small-timer-text">{secs}</span>
    </div>
  );
}

// ── Idle / waiting screen ────────────────────────────────────────────────────
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

// ── Multiple Choice Question ─────────────────────────────────────────────────
function MultipleChoiceView({
  options, answered, selected, role, onSelect,
}: {
  options: string[];
  answered: boolean;
  selected: number | null;
  role: 'host' | 'player';
  onSelect: (i: number) => void;
}) {
  if (role === 'host') {
    return (
      <div className="gs-host-view">
        <motion.div className="gs-host-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} />
        <p className="gs-host-label">Waiting for players to answer...</p>
        <div className="gs-host-options-grid">
          {options.map((opt, i) => (
            <motion.div key={i} className="gs-host-option-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <span className="gs-btn-shape" style={{ color: BTN_COLORS[i] }}>{BTN_SHAPES[i]}</span>
              <span className="gs-host-opt-text">{opt}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="gs-options-grid" data-count={options.length}>
      {options.map((opt, i) => (
        <motion.button
          key={i}
          className={`gs-option-btn ${selected === i ? 'selected' : ''}`}
          style={{
            '--btn-color': BTN_COLORS[i],
            '--btn-shadow': BTN_COLORS[i] + '80',
          } as any}
          onClick={() => onSelect(i)}
          disabled={answered}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
          whileHover={!answered ? { scale: 1.03 } : {}}
          whileTap={!answered ? { scale: 0.97 } : {}}
        >
          <span className="gs-option-shape">{BTN_SHAPES[i]}</span>
          <span className="gs-option-label">{opt}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ── True/False Question ──────────────────────────────────────────────────────
function TrueFalseView({
  answered, selected, role, onSelect,
}: {
  answered: boolean;
  selected: boolean | null;
  role: 'host' | 'player';
  onSelect: (v: boolean) => void;
}) {
  if (role === 'host') {
    return (
      <div className="gs-host-view">
        <motion.div className="gs-host-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} />
        <p className="gs-host-label">True or False? Waiting for answers...</p>
        <div className="gs-tf-host-row">
          <div className="gs-tf-host-card gs-tf-true">
            <span className="gs-tf-icon">✓</span>
            <span>True</span>
          </div>
          <div className="gs-tf-host-card gs-tf-false">
            <span className="gs-tf-icon">✗</span>
            <span>False</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gs-tf-grid">
      <motion.button
        className={`gs-tf-btn gs-tf-true ${selected === true ? 'selected' : ''}`}
        onClick={() => onSelect(true)}
        disabled={answered}
        whileHover={!answered ? { scale: 1.04 } : {}}
        whileTap={!answered ? { scale: 0.96 } : {}}
      >
        <span className="gs-tf-icon">✓</span>
        <span className="gs-tf-label">True</span>
      </motion.button>
      <motion.button
        className={`gs-tf-btn gs-tf-false ${selected === false ? 'selected' : ''}`}
        onClick={() => onSelect(false)}
        disabled={answered}
        whileHover={!answered ? { scale: 1.04 } : {}}
        whileTap={!answered ? { scale: 0.96 } : {}}
      >
        <span className="gs-tf-icon">✗</span>
        <span className="gs-tf-label">False</span>
      </motion.button>
    </div>
  );
}

// ── Type Answer Question ─────────────────────────────────────────────────────
function TypeAnswerView({
  answered, role, onSubmit,
}: {
  answered: boolean;
  role: 'host' | 'player';
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');

  if (role === 'host') {
    return (
      <div className="gs-host-view">
        <motion.div className="gs-host-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} />
        <p className="gs-host-label">Players are typing their answers...</p>
        <div className="gs-type-host-indicator">
          <span className="gs-typing-dots">
            <span /><span /><span />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="gs-type-answer-container">
      <div className="gs-type-input-wrapper">
        <input
          className="gs-type-input"
          placeholder="Type your answer..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim() && !answered) onSubmit(text.trim()); }}
          disabled={answered}
          autoFocus
          maxLength={100}
        />
        <span className="gs-type-char-count">{text.length}/100</span>
      </div>
      <motion.button
        className="gs-type-submit"
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={answered || !text.trim()}
        whileHover={!answered ? { scale: 1.05 } : {}}
        whileTap={!answered ? { scale: 0.95 } : {}}
      >
        {answered ? '✓ Submitted' : 'Submit Answer'}
      </motion.button>
    </div>
  );
}

// ── Slider Question ──────────────────────────────────────────────────────────
function SliderView({
  questionData, answered, role, onSubmit,
}: {
  questionData: { min: number; max: number; step: number };
  answered: boolean;
  role: 'host' | 'player';
  onSubmit: (value: number) => void;
}) {
  const mid = Math.round((questionData.min + questionData.max) / 2);
  const [value, setValue] = useState(mid);

  if (role === 'host') {
    return (
      <div className="gs-host-view">
        <motion.div className="gs-host-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} />
        <p className="gs-host-label">Players are picking their values...</p>
        <div className="gs-slider-host-range">
          <span>{questionData.min}</span>
          <div className="gs-slider-host-track" />
          <span>{questionData.max}</span>
        </div>
      </div>
    );
  }

  const pct = ((value - questionData.min) / (questionData.max - questionData.min)) * 100;

  return (
    <div className="gs-slider-container">
      <div className="gs-slider-value-display">
        <motion.span
          key={value}
          className="gs-slider-value"
          initial={{ scale: 1.3, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {value}
        </motion.span>
      </div>
      <div className="gs-slider-track-wrapper">
        <span className="gs-slider-label">{questionData.min}</span>
        <div className="gs-slider-track">
          <div className="gs-slider-fill" style={{ width: `${pct}%` }} />
          <input
            type="range"
            className="gs-slider-input"
            min={questionData.min}
            max={questionData.max}
            step={questionData.step || 1}
            value={value}
            onChange={e => setValue(Number(e.target.value))}
            disabled={answered}
          />
        </div>
        <span className="gs-slider-label">{questionData.max}</span>
      </div>
      <motion.button
        className="gs-slider-submit"
        onClick={() => onSubmit(value)}
        disabled={answered}
        whileHover={!answered ? { scale: 1.05 } : {}}
        whileTap={!answered ? { scale: 0.95 } : {}}
      >
        {answered ? '✓ Locked In' : 'Lock In Answer'}
      </motion.button>
    </div>
  );
}

// ── Poll Question ────────────────────────────────────────────────────────────
function PollView({
  options, answered, selected, role, onSelect,
}: {
  options: string[];
  answered: boolean;
  selected: number | null;
  role: 'host' | 'player';
  onSelect: (i: number) => void;
}) {
  if (role === 'host') {
    return (
      <div className="gs-host-view">
        <motion.div className="gs-host-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} />
        <p className="gs-host-label">Collecting votes...</p>
        <div className="gs-poll-host-options">
          {options.map((opt, i) => (
            <div key={i} className="gs-poll-host-opt">
              <span className="gs-btn-shape" style={{ color: BTN_COLORS[i] }}>{BTN_SHAPES[i]}</span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="gs-poll-grid">
      {options.map((opt, i) => (
        <motion.button
          key={i}
          className={`gs-poll-btn ${selected === i ? 'selected' : ''}`}
          style={{ '--btn-color': BTN_COLORS[i] } as any}
          onClick={() => onSelect(i)}
          disabled={answered}
          whileHover={!answered ? { scale: 1.03 } : {}}
          whileTap={!answered ? { scale: 0.97 } : {}}
        >
          <span className="gs-poll-shape">{BTN_SHAPES[i]}</span>
          <span className="gs-poll-label">{opt}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ── Ordering Question ────────────────────────────────────────────────────────
function OrderingView({
  items, answered, role, onSubmit,
}: {
  items: string[];
  answered: boolean;
  role: 'host' | 'player';
  onSubmit: (order: number[]) => void;
}) {
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));

  function moveItem(from: number, to: number) {
    if (answered) return;
    const newOrder = [...order];
    const [item] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, item);
    setOrder(newOrder);
  }

  if (role === 'host') {
    return (
      <div className="gs-host-view">
        <motion.div className="gs-host-spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} />
        <p className="gs-host-label">Players are arranging items in order...</p>
        <div className="gs-ordering-host-items">
          {items.map((_item, i) => (
            <div key={i} className="gs-ordering-host-item">
              <span className="gs-ordering-num">{i + 1}</span>
              <span>???</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="gs-ordering-container">
      <p className="gs-ordering-hint">Drag to reorder, or use the arrows</p>
      <div className="gs-ordering-list">
        {order.map((itemIdx: number, pos: number) => (
          <motion.div
            key={itemIdx}
            className="gs-ordering-item"
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: pos * 0.05 }}
          >
            <span className="gs-ordering-pos">{pos + 1}</span>
            <span className="gs-ordering-text">{items[itemIdx]}</span>
            <div className="gs-ordering-arrows">
              <button
                className="gs-ordering-arrow"
                onClick={() => pos > 0 && moveItem(pos, pos - 1)}
                disabled={answered || pos === 0}
              >▲</button>
              <button
                className="gs-ordering-arrow"
                onClick={() => pos < order.length - 1 && moveItem(pos, pos + 1)}
                disabled={answered || pos === order.length - 1}
              >▼</button>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.button
        className="gs-ordering-submit"
        onClick={() => onSubmit(order)}
        disabled={answered}
        whileHover={!answered ? { scale: 1.05 } : {}}
        whileTap={!answered ? { scale: 0.95 } : {}}
      >
        {answered ? '✓ Locked In' : 'Submit Order'}
      </motion.button>
    </div>
  );
}

// ── Main Question Screen ─────────────────────────────────────────────────────
export function QuestionScreen({ data, onAnswer }: { data: QuestionData; onAnswer?: (a: any) => void }) {
  const [timeLeft, setTimeLeft] = useState(data.timeLimit);
  const [answered, setAnswered] = useState(false);
  const [mcSelected, setMcSelected] = useState<number | null>(null);
  const [tfSelected, setTfSelected] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveOnAnswer = onAnswer ?? data.onAnswer;
  const onAnswerRef = useRef(effectiveOnAnswer);
  onAnswerRef.current = effectiveOnAnswer;

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

  // Countdown
  useEffect(() => {
    if (answered) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        const next = Math.max(0, t - 100);
        if (next <= 0) {
          clearInterval(id);
          setAnswered(true);
          onAnswerRef.current?.({ timeout: true });
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [answered]);

  function submitAnswer(answer: any) {
    if (answered) return;
    setAnswered(true);
    audioRef.current?.pause();
    onAnswerRef.current?.(answer);
  }

  function handleMcSelect(i: number) {
    setMcSelected(i);
    submitAnswer({ index: i });
  }

  function handleTfSelect(v: boolean) {
    setTfSelected(v);
    submitAnswer({ value: v });
  }

  function handleTypeSubmit(text: string) {
    submitAnswer({ text });
  }

  function handleSliderSubmit(value: number) {
    submitAnswer({ value });
  }

  function handlePollSelect(i: number) {
    setMcSelected(i);
    submitAnswer({ index: i });
  }

  function handleOrderingSubmit(order: number[]) {
    submitAnswer({ order });
  }

  // Type badge label
  const typeLabels: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True / False',
    type_answer: 'Type Answer',
    slider: 'Slider',
    poll: 'Poll',
    ordering: 'Ordering',
  };

  return (
    <div className="gs-screen gs-dark-bg">
      {/* Top bar */}
      <div className="gs-topbar">
        <div className="gs-top-left">
          <div className="gs-q-badge">
            <span className="gs-q-num">{data.index + 1}</span>
            <span className="gs-q-total">/ {data.total}</span>
          </div>
          <span className="gs-type-badge">{typeLabels[data.type] || data.type}</span>
        </div>
        <div className="gs-top-center">
        </div>
        <div className="gs-top-right">
          <TimerRing timeLeft={timeLeft} timeLimit={data.timeLimit} />
        </div>
      </div>

      {/* Question text */}
      <div className="gs-question-area">
        <motion.h2
          className="gs-question-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, type: 'spring' }}
        >
          {data.text}
        </motion.h2>
      </div>

      {/* Type-specific answer area */}
      <div className="gs-answer-area">
        {data.type === 'multiple_choice' && (
          <MultipleChoiceView
            options={data.questionData.options || []}
            answered={answered}
            selected={mcSelected}
            role={data.role}
            onSelect={handleMcSelect}
          />
        )}
        {data.type === 'true_false' && (
          <TrueFalseView
            answered={answered}
            selected={tfSelected}
            role={data.role}
            onSelect={handleTfSelect}
          />
        )}
        {data.type === 'type_answer' && (
          <TypeAnswerView
            answered={answered}
            role={data.role}
            onSubmit={handleTypeSubmit}
          />
        )}
        {data.type === 'slider' && (
          <SliderView
            questionData={data.questionData as any}
            answered={answered}
            role={data.role}
            onSubmit={handleSliderSubmit}
          />
        )}
        {data.type === 'poll' && (
          <PollView
            options={data.questionData.options || []}
            answered={answered}
            selected={mcSelected}
            role={data.role}
            onSelect={handlePollSelect}
          />
        )}
        {data.type === 'ordering' && (
          <OrderingView
            items={data.questionData.items || []}
            answered={answered}
            role={data.role}
            onSubmit={handleOrderingSubmit}
          />
        )}
      </div>

      {/* Footer for player */}
      {data.role === 'player' && data.playerName && (
        <div className="gs-footer">
          <div className="gs-player-info">
            <div className="gs-player-avatar">{data.playerName[0]?.toUpperCase()}</div>
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

// ── Result Screen ────────────────────────────────────────────────────────────
export function ResultScreen({ data }: { data: ResultData }) {
  const me = data.leaderboard.find(p => p.name === data.playerName);
  const isPlayer = !!data.playerName;

  // Kahoot-style scoreboard climb: rows start in the PREVIOUS ranking (score
  // before this round's points were added) then slide to their new positions.
  const withPrev = data.leaderboard.map(p => ({ ...p, prevScore: p.score - p.points }));
  const initialOrder = [...withPrev].sort((a, b) => b.prevScore - a.prevScore);
  const finalOrder = [...withPrev].sort((a, b) => b.score - a.score);
  const [showFinal, setShowFinal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFinal(true), 900); // let the count-up run first
    return () => clearTimeout(t);
  }, []);
  const ordered = (showFinal ? finalOrder : initialOrder).slice(0, 5);

  // Get display info based on type
  function getCorrectDisplay(): string {
    switch (data.type) {
      case 'multiple_choice': {
        const opts = data.questionData.options || [];
        const ci = data.questionData.correctIndex;
        return opts[ci] || '';
      }
      case 'true_false':
        return data.questionData.correctAnswer ? 'True' : 'False';
      case 'type_answer':
        return (data.questionData.acceptedAnswers || []).join(' / ');
      case 'slider':
        return String(data.questionData.correctValue);
      case 'ordering':
        return (data.questionData.correctOrder || [])
          .map((i: number) => data.questionData.items?.[i])
          .join(' → ');
      default:
        return '';
    }
  }

  return (
    <div className="gs-screen gs-dark-bg">
      <div className="gs-topbar">
        <div className="gs-top-left" />
        <span className="gs-result-title">Results</span>
        <div className="gs-top-right" />
      </div>

      <div className="gs-result-content">
        {/* Player result banner */}
        {isPlayer && me && (
          <motion.div
            className={`gs-result-banner ${me.correct ? 'correct' : 'wrong'}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <div className="gs-banner-icon">{me.correct ? '✓' : '✗'}</div>
            <div className="gs-banner-text">
              <h2>{me.correct ? 'Correct!' : 'Incorrect'}</h2>
              <p>{me.points > 0 ? `+${me.points} points` : '0 points'}</p>
            </div>
          </motion.div>
        )}

        {/* Correct answer display */}
        {data.type !== 'poll' && (
          <motion.div
            className="gs-correct-answer-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="gs-correct-label">Correct Answer</span>
            <span className="gs-correct-value">{getCorrectDisplay()}</span>
          </motion.div>
        )}

        {/* Poll results chart */}
        {data.type === 'poll' && data.pollResults && (
          <div className="gs-poll-results">
            {(data.questionData.options || []).map((opt: string, i: number) => {
              const count = data.pollResults?.[i] || 0;
              const total = Object.values(data.pollResults || {}).reduce((s: number, v: any) => s + (v as number), 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <motion.div
                  key={i}
                  className="gs-poll-bar-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="gs-poll-bar-label" style={{ color: BTN_COLORS[i] }}>{opt}</span>
                  <div className="gs-poll-bar-track">
                    <motion.div
                      className="gs-poll-bar-fill"
                      style={{ backgroundColor: BTN_COLORS[i] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    />
                  </div>
                  <span className="gs-poll-bar-pct">{pct}%</span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Leaderboard preview — rows animate (layout) to their new rank */}
        <div className="gs-result-leaderboard">
          {ordered.map((p, i) => {
            const isMe = p.name === data.playerName;
            return (
              <motion.div
                key={p.name}
                layout
                className={`gs-result-lb-row ${isMe ? 'me' : ''} ${p.correct ? 'was-correct' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ layout: { type: 'spring', stiffness: 500, damping: 32 }, opacity: { delay: i * 0.06 } }}
              >
                <motion.span className="gs-lb-rank" key={i} initial={{ scale: 1.4 }} animate={{ scale: 1 }}>{i + 1}</motion.span>
                <span className="gs-lb-name">{p.name}{isMe ? ' (you)' : ''}</span>
                <span className="gs-lb-points">{p.points > 0 ? `+${p.points}` : '+0'}</span>
                <CountUp className="gs-lb-score" from={p.prevScore} to={p.score} duration={0.9} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {isPlayer && me && (
        <div className="gs-footer">
          <div className="gs-player-info">
            <div className="gs-player-avatar">{data.playerName![0]?.toUpperCase()}</div>
            <div className="gs-player-details">
              <span className="gs-player-name">{data.playerName}</span>
              <span className="gs-player-score">
                <CountUp from={me.score - me.points} to={me.score} duration={0.9} /> pts
              </span>
            </div>
          </div>
        </div>
      )}

      <motion.p
        className="gs-next-label"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        {data.isLast ? 'Final results coming up…' : 'Next question in 5s…'}
      </motion.p>
    </div>
  );
}

// ── End Screen / Podium ──────────────────────────────────────────────────────
export function EndScreen({ data }: { data: EndData }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const top3 = data.leaderboard.slice(0, 3);
  const rest = data.leaderboard.slice(3);
  const podiumOrder = [1, 0, 2]; // centre=1st, left=2nd, right=3rd
  const podiumHeights = ['75%', '100%', '60%'];

  useEffect(() => {
    if (!data.onPlayAgain) return;
    const audio = new Audio('/sounds/end_sound.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, [data.onPlayAgain]);

  return (
    <div className="gs-screen gs-end-bg">
      <Confetti />
      <SunRays />

      <div className="gs-end-header">
        <motion.h1
          className="gs-end-title"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          🏆 Podium
        </motion.h1>
      </div>

      <div className="gs-podium-section">
        <div className="gs-podium-container">
          {podiumOrder.map((lbIdx, slotIdx) => {
            const entry = top3[lbIdx];
            if (!entry) return <div key={slotIdx} className="gs-podium-empty" />;
            const isMe = entry.name === data.playerName;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={slotIdx} className={`gs-podium-col rank-${lbIdx + 1} ${isMe ? 'me' : ''}`}>
                <motion.div
                  className="gs-podium-avatar-area"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + slotIdx * 0.2 }}
                >
                  {lbIdx === 0 && <div className="gs-podium-crown">👑</div>}
                  <div className={`gs-podium-avatar-circle rank-${lbIdx + 1}`}>
                    {entry.name[0]?.toUpperCase()}
                  </div>
                  <span className="gs-podium-player-name">{entry.name}</span>
                </motion.div>
                <motion.div
                  className={`gs-podium-bar rank-${lbIdx + 1}`}
                  initial={{ height: 0 }}
                  animate={{ height: podiumHeights[slotIdx] }}
                  transition={{ duration: 1, type: 'spring', delay: slotIdx * 0.2 }}
                >
                  <span className="gs-podium-medal">{medals[lbIdx]}</span>
                  <span className="gs-podium-rank">{lbIdx + 1}</span>
                  <span className="gs-podium-score">{entry.score}</span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="gs-runners-section">
          <div className="gs-runners-title">Other players</div>
          <div className="gs-runners-list">
            {rest.slice(0, 7).map((p, i) => {
              const isMe = p.name === data.playerName;
              return (
                <motion.div
                  key={i}
                  className={`gs-runner-row ${isMe ? 'me' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.05 }}
                >
                  <span className="gs-runner-rank">{i + 4}</span>
                  <span className="gs-runner-avatar">{p.name[0]?.toUpperCase()}</span>
                  <span className="gs-runner-name">{p.name}</span>
                  <span className="gs-runner-score">{p.score}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="gs-end-actions">
        {data.onPlayAgain && (
          <motion.button
            className="gs-end-btn primary"
            onClick={data.onPlayAgain}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ▶ Play Again
          </motion.button>
        )}
        <motion.button
          className="gs-end-btn secondary"
          onClick={data.onHome}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🏠 Home
        </motion.button>
      </div>
    </div>
  );
}

// ── Game controller ──────────────────────────────────────────────────────────
type GameView =
  | { type: 'idle' }
  | { type: 'question'; data: QuestionData }
  | { type: 'result'; data: ResultData }
  | { type: 'end'; data: EndData };

interface GameControllerProps {
  view: GameView;
  onAnswer?: (answer: any) => void;
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
