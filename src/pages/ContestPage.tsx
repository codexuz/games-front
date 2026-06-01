import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './GamePage.css';
import './ContestPage.css';

const API = 'http://localhost:3001/api';
const BTN_LABELS = ['A', 'B', 'C', 'D'];

type Phase = 'setup_quiz' | 'setup_names' | 'playing' | 'ended';

interface Quiz { id: string; title: string; questions: { text: string; options: string[]; correct: number; timeLimit: number }[] }
interface EndResult { p1Score: number; p2Score: number; p1Name: string; p2Name: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PlayerPanelProps {
  side: 1 | 2;
  name: string;
  score: number;
  question: { text: string; options: string[]; correct: number; timeLimit: number };
  timeLeft: number;
  answered: boolean;
  selectedIdx: number | null;
  correct: boolean | null;
  done: boolean;
  onAnswer: (idx: number) => void;
}

function PlayerPanel({ side, name, score, question, timeLeft, answered, selectedIdx, correct, done, onAnswer }: PlayerPanelProps) {
  const color = side === 1 ? '#1368ce' : '#e21b3c';
  const pct = Math.max(0, timeLeft / question.timeLimit);

  return (
    <div className="cp-panel">
      {/* Header */}
      <div className="cp-panel-header" style={{ background: color }}>
        <span className="cp-panel-name">{name}</span>
        <span className="cp-panel-score">{score}</span>
      </div>

      {/* Timer bar */}
      <div className="cp-timer-track">
        <div
          className="cp-timer-fill"
          style={{
            width: `${pct * 100}%`,
            background: pct < 0.25 ? '#e21b3c' : pct < 0.5 ? '#f59e0b' : color,
            transition: 'width 0.1s linear, background 0.3s',
          }}
        />
      </div>

      {/* Question */}
      <div className="cp-question" style={{ color }}>
        {done ? 'Finished! Waiting for opponent…' : question.text}
      </div>

      {/* Options */}
      {!done && (
        <div className="cp-options">
          {question.options.map((opt, i) => {
            let state: 'default' | 'selected' | 'correct' | 'wrong' | 'reveal-correct' = 'default';
            if (answered) {
              if (i === question.correct) state = 'correct';
              else if (i === selectedIdx) state = 'wrong';
              else state = 'default';
            }
            return (
              <button
                key={i}
                className={`cp-option cp-option--${state}`}
                onClick={() => !answered && onAnswer(i)}
                disabled={answered}
              >
                <span className="cp-option-badge" style={{ background: answered && i === question.correct ? '#22c55e' : answered && i === selectedIdx ? '#ef4444' : '#e5e7eb', color: answered && (i === question.correct || i === selectedIdx) ? '#fff' : '#555' }}>
                  {BTN_LABELS[i]}
                </span>
                <span className="cp-option-text">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Game Component ──────────────────────────────────────────────────────
interface GameState {
  qIndex: number;
  order: number[];
  score: number;
  timeLeft: number;
  answered: boolean;
  selectedIdx: number | null;
  correct: boolean | null;
  done: boolean;
}

function ContestGame({ quiz, p1Name, p2Name, onEnd }: {
  quiz: Quiz;
  p1Name: string;
  p2Name: string;
  onEnd: (r: EndResult) => void;
}) {
  const n = quiz.questions.length;
  const makeState = (): GameState => ({
    qIndex: 0,
    order: shuffle(Array.from({ length: n }, (_, i) => i)),
    score: 0,
    timeLeft: 0,
    answered: false,
    selectedIdx: null,
    correct: null,
    done: false,
  });

  const [p1, setP1] = useState<GameState>(() => { const s = makeState(); s.timeLeft = quiz.questions[s.order[0]].timeLimit; return s; });
  const [p2, setP2] = useState<GameState>(() => { const s = makeState(); s.timeLeft = quiz.questions[s.order[0]].timeLimit; return s; });
  const [centerTime, setCenterTime] = useState(0);
  const endedRef = useRef(false);

  // Tick timers
  useEffect(() => {
    const id = setInterval(() => {
      setP1(prev => tickPlayer(prev));
      setP2(prev => tickPlayer(prev));
      setCenterTime(t => t + 1);
    }, 100);
    return () => clearInterval(id);
  }, []);

  function tickPlayer(prev: GameState): GameState {
    if (prev.done || prev.answered) return prev;
    const newTime = Math.max(0, prev.timeLeft - 100);
    if (newTime <= 0) {
      // Time out — mark as answered wrong, schedule advance
      return { ...prev, timeLeft: 0, answered: true, correct: false, selectedIdx: null };
    }
    return { ...prev, timeLeft: newTime };
  }

  // Auto-advance after answering
  useEffect(() => { if (p1.answered && !p1.done) { const t = setTimeout(() => setP1(advance), 900); return () => clearTimeout(t); } }, [p1.answered]);
  useEffect(() => { if (p2.answered && !p2.done) { const t = setTimeout(() => setP2(advance), 900); return () => clearTimeout(t); } }, [p2.answered]);

  function advance(prev: GameState): GameState {
    const nextIdx = prev.qIndex + 1;
    if (nextIdx >= n) return { ...prev, done: true };
    const nextQ = quiz.questions[prev.order[nextIdx]];
    return { ...prev, qIndex: nextIdx, answered: false, selectedIdx: null, correct: null, timeLeft: nextQ.timeLimit };
  }

  function calcScore(state: GameState): number {
    const q = quiz.questions[state.order[state.qIndex]];
    if (!state.correct) return 0;
    const ratio = Math.max(0, state.timeLeft / q.timeLimit);
    return Math.round(500 + 500 * ratio);
  }

  function handleAnswer(player: 1 | 2, idx: number) {
    const setter = player === 1 ? setP1 : setP2;
    setter(prev => {
      if (prev.answered || prev.done) return prev;
      const q = quiz.questions[prev.order[prev.qIndex]];
      const correct = idx === q.correct;
      const pts = correct ? Math.round(500 + 500 * Math.max(0, prev.timeLeft / q.timeLimit)) : 0;
      return { ...prev, answered: true, selectedIdx: idx, correct, score: prev.score + pts };
    });
  }

  // Check game end — finish as soon as either player completes all questions
  useEffect(() => {
    if ((p1.done || p2.done) && !endedRef.current) {
      endedRef.current = true;
      setTimeout(() => onEnd({ p1Score: p1.score, p2Score: p2.score, p1Name, p2Name }), 800);
    }
  }, [p1.done, p2.done]);

  const q1 = quiz.questions[p1.order[p1.qIndex]];
  const q2 = quiz.questions[p2.order[p2.qIndex]];

  const totalSecs = centerTime / 10;
  const mm = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const ss = String(Math.floor(totalSecs % 60)).padStart(2, '0');

  return (
    <div className="cp-game">
      {/* Left panel */}
      <PlayerPanel
        side={1} name={p1Name} score={p1.score}
        question={q1} timeLeft={p1.timeLeft}
        answered={p1.answered} selectedIdx={p1.selectedIdx}
        correct={p1.correct} done={p1.done}
        onAnswer={i => handleAnswer(1, i)}
      />

      {/* Centre arena */}
      <div className="cp-center">
        <div className="cp-center-scores">
          <div className="cp-center-player">
            <span className="cp-center-name" style={{ color: '#1368ce' }}>{p1Name}</span>
            <span className="cp-center-pts" style={{ color: '#1368ce' }}>{p1.score}</span>
          </div>
          <div className="cp-center-clock">
            <span className="cp-clock-icon">🕐</span>
            <span className="cp-clock-val">{mm}:{ss}</span>
          </div>
          <div className="cp-center-player">
            <span className="cp-center-name" style={{ color: '#e21b3c' }}>{p2Name}</span>
            <span className="cp-center-pts" style={{ color: '#e21b3c' }}>{p2.score}</span>
          </div>
        </div>

        <div className="cp-center-divider" />

        <div className="cp-center-progress">
          <div className="cp-progress-label">Q {p1.qIndex + 1}/{n}</div>
          <div className="cp-progress-bar">
            <div className="cp-progress-fill p1-fill" style={{ height: `${((p1.qIndex + (p1.done ? 1 : 0)) / n) * 100}%` }} />
          </div>
          <div className="cp-progress-bar">
            <div className="cp-progress-fill p2-fill" style={{ height: `${((p2.qIndex + (p2.done ? 1 : 0)) / n) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <PlayerPanel
        side={2} name={p2Name} score={p2.score}
        question={q2} timeLeft={p2.timeLeft}
        answered={p2.answered} selectedIdx={p2.selectedIdx}
        correct={p2.correct} done={p2.done}
        onAnswer={i => handleAnswer(2, i)}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContestPage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>('setup_quiz');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [endResult, setEndResult] = useState<EndResult | null>(null);

  useEffect(() => {
    fetch(`${API}/quizzes`).then(r => r.json()).then(setQuizzes).catch(() => {});
  }, []);

  function startContest() {
    if (!selectedQuiz) return;
    if (!p1Name.trim()) return alert('Enter Player 1 name');
    if (!p2Name.trim()) return alert('Enter Player 2 name');
    if (p1Name.trim().toLowerCase() === p2Name.trim().toLowerCase()) return alert('Players must have different names');
    setPhase('playing');
  }

  function playAgain() { setEndResult(null); setPhase('setup_quiz'); }

  // ── Quiz pick ─────────────────────────────────────────────────────────────
  if (phase === 'setup_quiz') return (
    <div className="game-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => nav('/')}>← Back</button>
        <h2>⚔️ 1v1 Contest</h2>
      </div>
      <div className="contest-setup">
        <div className="quiz-pick-label">Choose a Quiz to Battle</div>
        <div className="quiz-grid">
          {quizzes.map(q => (
            <div key={q.id} className="quiz-card contest-card" onClick={() => { setSelectedQuiz(q); setPhase('setup_names'); }}>
              <div className="quiz-title">{q.title}</div>
              <div className="quiz-meta">{q.questions.length} questions</div>
              <div className="quiz-start-hint">Select →</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Name setup ────────────────────────────────────────────────────────────
  if (phase === 'setup_names') return (
    <div className="game-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => setPhase('setup_quiz')}>← Back</button>
        <h2>⚔️ Enter Players</h2>
      </div>
      <div className="contest-setup" style={{ alignItems: 'center' }}>
        <div className="quiz-pick-label">Selected: {selectedQuiz?.title}</div>
        <div className="players-row">
          <div className="player-input-group p1-group">
            <label>Player 1</label>
            <input className="input-field p1-input" placeholder="Left side" value={p1Name} onChange={e => setP1Name(e.target.value)} />
          </div>
          <div className="vs-badge">VS</div>
          <div className="player-input-group p2-group">
            <label>Player 2</label>
            <input className="input-field p2-input" placeholder="Right side" value={p2Name} onChange={e => setP2Name(e.target.value)} />
          </div>
        </div>
        <button className="btn-start" onClick={startContest}>▶ Start Battle</button>
      </div>
    </div>
  );

  // ── End screen ────────────────────────────────────────────────────────────
  if (phase === 'ended' && endResult) {
    const { p1Score, p2Score, p1Name: n1, p2Name: n2 } = endResult;
    const tied = p1Score === p2Score;
    const winner = p1Score > p2Score ? n1 : n2;
    return (
      <div className="game-page">
        <div className="contest-end">
          <div className="end-trophy">{tied ? '🤝' : '🏆'}</div>
          <h2 className="end-title">{tied ? "It's a Tie!" : `${winner} Wins!`}</h2>
          <p className="end-quiz-label">{selectedQuiz?.title}</p>
          <div className="end-scores">
            <div className={`end-score-card ${!tied && winner === n1 ? 'winner' : ''} p1-card`}>
              <div className="end-score-name">{n1}</div>
              <div className="end-score-pts">{p1Score}</div>
              <div className="end-score-label">points</div>
              {!tied && winner === n1 && <div className="winner-crown">👑</div>}
            </div>
            <div className="end-vs">VS</div>
            <div className={`end-score-card ${!tied && winner === n2 ? 'winner' : ''} p2-card`}>
              <div className="end-score-name">{n2}</div>
              <div className="end-score-pts">{p2Score}</div>
              <div className="end-score-label">points</div>
              {!tied && winner === n2 && <div className="winner-crown">👑</div>}
            </div>
          </div>
          {!tied && <p className="end-margin">{winner} won by <strong>{Math.abs(p1Score - p2Score)}</strong> points</p>}
          <div className="end-actions">
            <button className="btn-primary" onClick={playAgain}>▶ Play Again</button>
            <button className="btn-secondary" onClick={() => nav('/')}>🏠 Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  return (
    <div className="game-page cp-game-page">
      <ContestGame
        key={`${p1Name}-${p2Name}-${selectedQuiz?.id}`}
        quiz={selectedQuiz!}
        p1Name={p1Name.trim()}
        p2Name={p2Name.trim()}
        onEnd={r => { setEndResult(r); setPhase('ended'); }}
      />
    </div>
  );
}
