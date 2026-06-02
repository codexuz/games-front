import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './GamePage.css';
import './ContestPage.css';

const API = 'http://localhost:3001/api';

type Phase = 'setup_quiz' | 'setup_names' | 'playing' | 'ended';
type QuestionType = 'multiple_choice' | 'true_false' | 'type_answer';

interface QuestionItem {
  text: string;
  type: QuestionType;
  questionData: Record<string, any>;
  timeLimit: number;
  points: number;
}

interface Quiz { id: string; title: string; questions: QuestionItem[] }
interface EndResult { p1Score: number; p2Score: number; p1Name: string; p2Name: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const BTN_SHAPES = ['▲', '◆', '●', '■'];

// ── Player Panel ─────────────────────────────────────────────────────────────
interface PlayerPanelProps {
  side: 1 | 2;
  name: string;
  score: number;
  question: QuestionItem;
  timeLeft: number;
  answered: boolean;
  selectedAnswer: any;
  isCorrect: boolean | null;
  done: boolean;
  onAnswer: (answer: any) => void;
}

function PlayerPanel({ side, name, score, question, timeLeft, answered, selectedAnswer, isCorrect, done, onAnswer }: PlayerPanelProps) {
  const color = side === 1 ? '#7c3aed' : '#06b6d4';
  const pct = Math.max(0, timeLeft / question.timeLimit);
  const [typedText, setTypedText] = useState('');

  // Reset typed text when question changes
  useEffect(() => { setTypedText(''); }, [question.text]);

  return (
    <div className="cp-panel">
      <div className="cp-panel-header" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
        <span className="cp-panel-name">{name}</span>
        <span className="cp-panel-score">{score}</span>
      </div>

      <div className="cp-timer-track">
        <div
          className="cp-timer-fill"
          style={{
            width: `${pct * 100}%`,
            background: pct < 0.25 ? '#ef4444' : pct < 0.5 ? '#f59e0b' : color,
            transition: 'width 0.1s linear, background 0.3s',
          }}
        />
      </div>

      <div className="cp-question" style={{ color }}>
        {done ? 'Finished! Waiting for opponent…' : question.text}
      </div>

      {!done && question.type === 'multiple_choice' && (
        <div className="cp-options">
          {(question.questionData.options || []).map((opt: string, i: number) => {
            let state: string = 'default';
            if (answered) {
              if (i === question.questionData.correctIndex) state = 'correct';
              else if (selectedAnswer?.index === i) state = 'wrong';
            }
            return (
              <button key={i} className={`cp-option cp-option--${state}`} onClick={() => !answered && onAnswer({ index: i })} disabled={answered}>
                <span className="cp-option-badge" style={{
                  background: answered && i === question.questionData.correctIndex ? '#22c55e' : answered && selectedAnswer?.index === i ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  color: answered && (i === question.questionData.correctIndex || selectedAnswer?.index === i) ? '#fff' : '#aaa'
                }}>{BTN_SHAPES[i]}</span>
                <span className="cp-option-text">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {!done && question.type === 'true_false' && (
        <div className="cp-tf-buttons">
          {[true, false].map(val => {
            let state = 'default';
            if (answered) {
              if (val === question.questionData.correctAnswer) state = 'correct';
              else if (selectedAnswer?.value === val) state = 'wrong';
            }
            return (
              <button key={String(val)} className={`cp-tf-btn cp-tf-${val} cp-option--${state}`} onClick={() => !answered && onAnswer({ value: val })} disabled={answered}>
                <span className="cp-tf-icon">{val ? '✓' : '✗'}</span>
                <span>{val ? 'True' : 'False'}</span>
              </button>
            );
          })}
        </div>
      )}

      {!done && question.type === 'type_answer' && (
        <div className="cp-type-answer">
          <input
            className="cp-type-input"
            placeholder="Type your answer..."
            value={typedText}
            onChange={e => setTypedText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && typedText.trim() && !answered) onAnswer({ text: typedText.trim() }); }}
            disabled={answered}
            autoFocus={!answered}
          />
          <button className="cp-type-submit" onClick={() => typedText.trim() && onAnswer({ text: typedText.trim() })} disabled={answered || !typedText.trim()}>
            {answered ? (isCorrect ? '✓' : '✗') : 'Submit'}
          </button>
          {answered && (
            <div className={`cp-type-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect ? 'Correct!' : `Answer: ${(question.questionData.acceptedAnswers || [])[0] || ''}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Contest Game ──────────────────────────────────────────────────────────────
interface GameState {
  qIndex: number;
  order: number[];
  score: number;
  timeLeft: number;
  answered: boolean;
  selectedAnswer: any;
  isCorrect: boolean | null;
  done: boolean;
}

function checkAnswer(question: QuestionItem, answer: any): boolean {
  switch (question.type) {
    case 'multiple_choice':
      return answer?.index === question.questionData.correctIndex;
    case 'true_false':
      return answer?.value === question.questionData.correctAnswer;
    case 'type_answer': {
      const accepted = (question.questionData.acceptedAnswers || []) as string[];
      const caseSensitive = question.questionData.caseSensitive || false;
      const text = answer?.text || '';
      return accepted.some(a => caseSensitive ? a === text : a.toLowerCase() === text.toLowerCase());
    }
    default:
      return false;
  }
}

function ContestGame({ quiz, p1Name, p2Name, onEnd }: {
  quiz: Quiz; p1Name: string; p2Name: string; onEnd: (r: EndResult) => void;
}) {
  const n = quiz.questions.length;
  const makeState = (): GameState => ({
    qIndex: 0,
    order: shuffle(Array.from({ length: n }, (_, i) => i)),
    score: 0, timeLeft: 0, answered: false, selectedAnswer: null, isCorrect: null, done: false,
  });

  const [p1, setP1] = useState<GameState>(() => { const s = makeState(); s.timeLeft = quiz.questions[s.order[0]].timeLimit; return s; });
  const [p2, setP2] = useState<GameState>(() => { const s = makeState(); s.timeLeft = quiz.questions[s.order[0]].timeLimit; return s; });
  const [centerTime, setCenterTime] = useState(0);
  const endedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play contest music
  useEffect(() => {
    const audio = new Audio('/sounds/contest_sound.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => { audio.pause(); audio.currentTime = 0; };
  }, []);

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
    if (newTime <= 0) return { ...prev, timeLeft: 0, answered: true, isCorrect: false, selectedAnswer: null };
    return { ...prev, timeLeft: newTime };
  }

  useEffect(() => { if (p1.answered && !p1.done) { const t = setTimeout(() => setP1(advance), 1200); return () => clearTimeout(t); } }, [p1.answered]);
  useEffect(() => { if (p2.answered && !p2.done) { const t = setTimeout(() => setP2(advance), 1200); return () => clearTimeout(t); } }, [p2.answered]);

  function advance(prev: GameState): GameState {
    const nextIdx = prev.qIndex + 1;
    if (nextIdx >= n) return { ...prev, done: true };
    const nextQ = quiz.questions[prev.order[nextIdx]];
    return { ...prev, qIndex: nextIdx, answered: false, selectedAnswer: null, isCorrect: null, timeLeft: nextQ.timeLimit };
  }

  function handleAnswer(player: 1 | 2, answer: any) {
    const setter = player === 1 ? setP1 : setP2;
    setter(prev => {
      if (prev.answered || prev.done) return prev;
      const q = quiz.questions[prev.order[prev.qIndex]];
      const correct = checkAnswer(q, answer);
      const maxPts = q.points || 1000;
      const pts = correct ? Math.round((maxPts / 2) + (maxPts / 2) * Math.max(0, prev.timeLeft / q.timeLimit)) : 0;
      return { ...prev, answered: true, selectedAnswer: answer, isCorrect: correct, score: prev.score + pts };
    });
  }

  useEffect(() => {
    if ((p1.done || p2.done) && !endedRef.current) {
      endedRef.current = true;
      audioRef.current?.pause();
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
      <PlayerPanel side={1} name={p1Name} score={p1.score} question={q1} timeLeft={p1.timeLeft}
        answered={p1.answered} selectedAnswer={p1.selectedAnswer} isCorrect={p1.isCorrect} done={p1.done}
        onAnswer={a => handleAnswer(1, a)} />

      <div className="cp-center">
        <div className="cp-center-scores">
          <div className="cp-center-player">
            <span className="cp-center-name" style={{ color: '#a78bfa' }}>{p1Name}</span>
            <span className="cp-center-pts" style={{ color: '#a78bfa' }}>{p1.score}</span>
          </div>
          <div className="cp-center-clock">
            <span className="cp-clock-val">{mm}:{ss}</span>
          </div>
          <div className="cp-center-player">
            <span className="cp-center-name" style={{ color: '#22d3ee' }}>{p2Name}</span>
            <span className="cp-center-pts" style={{ color: '#22d3ee' }}>{p2.score}</span>
          </div>
        </div>
        <div className="cp-center-divider" />
        <div className="cp-center-progress">
          <div className="cp-progress-label">Q {Math.max(p1.qIndex, p2.qIndex) + 1}/{n}</div>
          <div className="cp-progress-bars">
            <div className="cp-progress-bar">
              <div className="cp-progress-fill p1-fill" style={{ height: `${((p1.qIndex + (p1.done ? 1 : 0)) / n) * 100}%` }} />
            </div>
            <div className="cp-progress-bar">
              <div className="cp-progress-fill p2-fill" style={{ height: `${((p2.qIndex + (p2.done ? 1 : 0)) / n) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <PlayerPanel side={2} name={p2Name} score={p2.score} question={q2} timeLeft={p2.timeLeft}
        answered={p2.answered} selectedAnswer={p2.selectedAnswer} isCorrect={p2.isCorrect} done={p2.done}
        onAnswer={a => handleAnswer(2, a)} />
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
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play result music when contest ends
  useEffect(() => {
    if (phase === 'ended') {
      const audio = new Audio('/sounds/contest_result.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      resultAudioRef.current = audio;
    } else {
      resultAudioRef.current?.pause();
      resultAudioRef.current = null;
    }
    return () => { resultAudioRef.current?.pause(); };
  }, [phase]);

  useEffect(() => {
    fetch(`${API}/quizzes`).then(r => r.json()).then(data => {
      // Filter to only supported contest types
      const filtered = (data as Quiz[]).map(q => ({
        ...q,
        questions: q.questions.filter((qu: any) =>
          ['multiple_choice', 'true_false', 'type_answer'].includes(qu.type || 'multiple_choice')
        ),
      })).filter(q => q.questions.length > 0);
      setQuizzes(filtered);
    }).catch(() => {});
  }, []);

  function startContest() {
    if (!selectedQuiz) return;
    if (!p1Name.trim()) return alert('Enter Player 1 name');
    if (!p2Name.trim()) return alert('Enter Player 2 name');
    if (p1Name.trim().toLowerCase() === p2Name.trim().toLowerCase()) return alert('Players must have different names');
    setPhase('playing');
  }

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

  if (phase === 'ended' && endResult) {
    const { p1Score, p2Score, p1Name: n1, p2Name: n2 } = endResult;
    const tied = p1Score === p2Score;
    const winner = p1Score > p2Score ? n1 : n2;
    return (
      <div className="game-page">
        <div className="contest-end">
          <motion.div className="end-trophy" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
            {tied ? '🤝' : '🏆'}
          </motion.div>
          <h2 className="end-title">{tied ? "It's a Tie!" : `${winner} Wins!`}</h2>
          <p className="end-quiz-label">{selectedQuiz?.title}</p>
          <div className="end-scores">
            <motion.div className={`end-score-card ${!tied && winner === n1 ? 'winner' : ''} p1-card`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="end-score-name">{n1}</div>
              <div className="end-score-pts">{p1Score}</div>
              <div className="end-score-label">points</div>
              {!tied && winner === n1 && <div className="winner-crown">👑</div>}
            </motion.div>
            <div className="end-vs">VS</div>
            <motion.div className={`end-score-card ${!tied && winner === n2 ? 'winner' : ''} p2-card`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="end-score-name">{n2}</div>
              <div className="end-score-pts">{p2Score}</div>
              <div className="end-score-label">points</div>
              {!tied && winner === n2 && <div className="winner-crown">👑</div>}
            </motion.div>
          </div>
          {!tied && <p className="end-margin">{winner} won by <strong>{Math.abs(p1Score - p2Score)}</strong> points</p>}
          <div className="end-actions">
            <button className="btn-primary" onClick={() => { setEndResult(null); setPhase('setup_quiz'); }}>▶ Play Again</button>
            <button className="btn-secondary" onClick={() => nav('/')}>🏠 Home</button>
          </div>
        </div>
      </div>
    );
  }

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
