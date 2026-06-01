import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const API = 'http://localhost:3001/api';

interface Question {
  text: string;
  options: string[];
  correct: number;
  timeLimit: number;
}

interface Quiz {
  id: string;
  title: string;
  category?: string;
  createdAt?: string;
  questions: Question[];
}

const BLANK_QUESTION = (): Question => ({ text: '', options: ['', '', '', ''], correct: 0, timeLimit: 20000 });

export default function DashboardPage() {
  const nav = useNavigate();
  const { teacher, token, logout } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'import'>('quizzes');

  // Create form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState<Question[]>([BLANK_QUESTION()]);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!teacher) nav('/auth');
  }, [teacher, nav]);

  useEffect(() => {
    if (teacher) fetchQuizzes();
  }, [teacher]);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/teacher/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuiz(id: string) {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    await fetch(`${API}/teacher/quizzes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setQuizzes(q => q.filter(x => x.id !== id));
  }

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!title.trim()) return setCreateError('Title is required');
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/teacher/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, category, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizzes(q => [data, ...q]);
      setTitle(''); setCategory(''); setQuestions([BLANK_QUESTION()]); setCreateError('');
      setActiveTab('quizzes');
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  function updateQuestion(qi: number, field: keyof Question, value: any) {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, [field]: value } : q));
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const opts = [...q.options];
      opts[oi] = value;
      return { ...q, options: opts };
    }));
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API}/teacher/quizzes/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult({ imported: data.imported, errors: data.errors || [] });
      if (data.imported > 0) fetchQuizzes();
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setImportResult({ imported: 0, errors: [err.message] });
    } finally {
      setImportLoading(false);
    }
  }

  if (!teacher) return null;

  return (
    <div className="dashboard-page">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">⚡ QuizBlitz</div>
        <div className="sidebar-teacher">
          <div className="teacher-avatar">{teacher.name[0].toUpperCase()}</div>
          <div>
            <div className="teacher-name">{teacher.name}</div>
            <div className="teacher-email">{teacher.email}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === 'quizzes' ? 'active' : ''} onClick={() => setActiveTab('quizzes')}>
            📋 My Quizzes
          </button>
          <button className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}>
            ✏️ Create Quiz
          </button>
          <button className={activeTab === 'import' ? 'active' : ''} onClick={() => setActiveTab('import')}>
            📥 Bulk Import
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-host-btn" onClick={() => nav('/host')}>🎓 Host a Game</button>
          <button className="sidebar-logout" onClick={logout}>Sign Out</button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="dashboard-main">

        {/* ── My Quizzes ────────────────────────────────────────────────── */}
        {activeTab === 'quizzes' && (
          <div className="tab-content">
            <div className="tab-header">
              <h1>My Quizzes</h1>
              <button className="btn-primary sm-btn" onClick={() => setActiveTab('create')}>+ Create Quiz</button>
            </div>

            {loading ? (
              <div className="loading-hint">Loading quizzes…</div>
            ) : quizzes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No quizzes yet.</p>
                <p>Create one manually or <button onClick={() => setActiveTab('import')}>import from a file</button>.</p>
              </div>
            ) : (
              <div className="quiz-list">
                {quizzes.map(q => (
                  <div key={q.id} className="quiz-row">
                    <div className="quiz-row-info">
                      <div className="quiz-row-title">{q.title}</div>
                      <div className="quiz-row-meta">
                        {q.category && <span className="cat-badge">{q.category}</span>}
                        <span>{q.questions.length} questions</span>
                        {q.createdAt && <span>{new Date(q.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="quiz-row-actions">
                      <button className="btn-host-quiz" onClick={() => nav('/host', { state: { preselect: q.id } })}>
                        ▶ Host
                      </button>
                      <button className="btn-delete" onClick={() => deleteQuiz(q.id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Create Quiz ───────────────────────────────────────────────── */}
        {activeTab === 'create' && (
          <div className="tab-content">
            <div className="tab-header">
              <h1>Create Quiz</h1>
            </div>
            <form onSubmit={createQuiz} className="create-form">
              <div className="form-row">
                <div className="field-group flex-1">
                  <label>Quiz Title *</label>
                  <input className="input-field" placeholder="e.g. World History Chapter 5" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="field-group">
                  <label>Category</label>
                  <input className="input-field" placeholder="e.g. History" value={category} onChange={e => setCategory(e.target.value)} />
                </div>
              </div>

              <div className="questions-header">
                <h3>Questions</h3>
                <button type="button" className="btn-secondary" onClick={() => setQuestions(q => [...q, BLANK_QUESTION()])}>
                  + Add Question
                </button>
              </div>

              {questions.map((q, qi) => (
                <div key={qi} className="question-card">
                  <div className="question-card-header">
                    <span className="q-num">Q{qi + 1}</span>
                    {questions.length > 1 && (
                      <button type="button" className="btn-delete-q" onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))}>✕</button>
                    )}
                  </div>
                  <input
                    className="input-field"
                    placeholder="Question text"
                    value={q.text}
                    onChange={e => updateQuestion(qi, 'text', e.target.value)}
                    required
                  />
                  <div className="options-grid">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`option-field ${q.correct === oi ? 'correct' : ''}`}>
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correct === oi}
                          onChange={() => updateQuestion(qi, 'correct', oi)}
                          title="Mark as correct answer"
                        />
                        <input
                          className="input-field opt-input"
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={e => updateOption(qi, oi, e.target.value)}
                          required
                        />
                        {q.correct === oi && <span className="correct-badge">✓</span>}
                      </div>
                    ))}
                  </div>
                  <div className="time-row">
                    <label>Time limit</label>
                    <select className="input-field time-select" value={q.timeLimit} onChange={e => updateQuestion(qi, 'timeLimit', Number(e.target.value))}>
                      <option value={10000}>10 seconds</option>
                      <option value={15000}>15 seconds</option>
                      <option value={20000}>20 seconds</option>
                      <option value={30000}>30 seconds</option>
                      <option value={45000}>45 seconds</option>
                      <option value={60000}>60 seconds</option>
                    </select>
                  </div>
                </div>
              ))}

              {createError && <div className="error-banner">⚠ {createError}</div>}
              <button className="btn-primary" type="submit" disabled={createLoading}>
                {createLoading ? 'Saving…' : `Save Quiz (${questions.length} question${questions.length !== 1 ? 's' : ''})`}
              </button>
            </form>
          </div>
        )}

        {/* ── Bulk Import ───────────────────────────────────────────────── */}
        {activeTab === 'import' && (
          <div className="tab-content">
            <div className="tab-header">
              <h1>Bulk Import</h1>
            </div>

            <div className="import-section">
              <h3>Download a Template</h3>
              <p className="import-hint">Download a template, fill it in, then upload it below.</p>
              <div className="template-grid">
                {[
                  { label: 'JSON', icon: '{ }', ext: 'json', desc: 'Best for developers / copy-paste' },
                  { label: 'Excel', icon: '📊', ext: 'xlsx', desc: 'Open in Excel or Google Sheets' },
                  { label: 'CSV', icon: '📄', ext: 'csv', desc: 'Open in any spreadsheet app' },
                  { label: 'Text', icon: '📝', ext: 'docx', desc: 'Plain text format for DOCX uploads' },
                ].map(t => (
                  <a
                    key={t.ext}
                    href={`${API}/templates/${t.ext}`}
                    className="template-card"
                    download
                  >
                    <div className="template-icon">{t.icon}</div>
                    <div className="template-label">{t.label}</div>
                    <div className="template-desc">{t.desc}</div>
                    <div className="template-dl">↓ Download</div>
                  </a>
                ))}
              </div>
            </div>

            <div className="import-section">
              <h3>Upload Your File</h3>
              <p className="import-hint">Supported: <strong>.json</strong>, <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.docx</strong>, <strong>.doc</strong></p>

              <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                <div className="upload-icon">📂</div>
                <div className="upload-text">Click to choose file or drag & drop</div>
                <div className="upload-sub">Max 10 MB</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.csv,.xlsx,.xls,.docx,.doc"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && setImportResult(null)}
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={importLoading}
              >
                {importLoading ? 'Importing…' : '📥 Import Quizzes'}
              </button>

              {importResult && (
                <div className={`import-result ${importResult.imported > 0 ? 'success' : 'fail'}`}>
                  {importResult.imported > 0 && (
                    <div className="import-ok">✓ {importResult.imported} quiz{importResult.imported !== 1 ? 'zes' : ''} imported successfully!</div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="import-errors">
                      <div className="import-errors-title">⚠ Warnings / Skipped:</div>
                      {importResult.errors.map((e, i) => <div key={i} className="import-error-item">• {e}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="import-section format-guide">
              <h3>Format Guide</h3>
              <div className="format-tabs">
                <div className="format-block">
                  <div className="format-title">JSON — array of quizzes</div>
                  <pre className="code-block">{`[{
  "title": "Quiz Title",
  "category": "Science",
  "questions": [{
    "text": "Question?",
    "options": ["A","B","C","D"],
    "correct": 2,
    "timeLimit": 20000
  }]
}]`}</pre>
                </div>
                <div className="format-block">
                  <div className="format-title">CSV / Excel — one row per question</div>
                  <pre className="code-block">{`quiz_title, category, question,
option_a, option_b, option_c, option_d,
correct_index, time_limit_ms

"Quiz Title","Sci","Q text?",
"A","B","C","D",2,20000`}</pre>
                </div>
                <div className="format-block">
                  <div className="format-title">DOCX / TXT — text format</div>
                  <pre className="code-block">{`QUIZ: My Quiz
CATEGORY: Science

Q: Question text?
A: Option A
B: Option B
C: Option C
D: Option D
CORRECT: C
TIME: 20000`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
