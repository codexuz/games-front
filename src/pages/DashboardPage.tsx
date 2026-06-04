import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import './DashboardPage.css';

const API = import.meta.env.VITE_API_URL;

type QuestionType = 'multiple_choice' | 'true_false' | 'type_answer' | 'slider' | 'poll' | 'ordering';

interface Question {
  text: string;
  type: QuestionType;
  questionData: Record<string, any>;
  timeLimit: number;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  category?: string;
  type?: 'public' | 'private';
  published?: boolean;
  createdAt?: string;
  questions: Question[];
}

const TYPE_LABELS: Record<QuestionType, { label: string; icon: string; desc: string }> = {
  multiple_choice: { label: 'Multiple Choice', icon: '🔘', desc: 'Pick the correct option' },
  true_false: { label: 'True / False', icon: '✅', desc: 'True or false question' },
  type_answer: { label: 'Type Answer', icon: '⌨️', desc: 'Type the correct answer' },
  slider: { label: 'Slider', icon: '🎚️', desc: 'Pick a number on a range' },
  poll: { label: 'Poll', icon: '📊', desc: 'No correct answer, vote only' },
  ordering: { label: 'Ordering', icon: '📋', desc: 'Put items in correct order' },
};

function blankQuestion(type: QuestionType = 'multiple_choice'): Question {
  const base = { text: '', type, timeLimit: 20000, points: 1000 };
  switch (type) {
    case 'multiple_choice': return { ...base, questionData: { options: ['', '', '', ''], correctIndex: 0 } };
    case 'true_false': return { ...base, questionData: { correctAnswer: true } };
    case 'type_answer': return { ...base, questionData: { acceptedAnswers: [''], caseSensitive: false } };
    case 'slider': return { ...base, questionData: { min: 0, max: 100, step: 1, correctValue: 50, tolerance: 5 } };
    case 'poll': return { ...base, questionData: { options: ['', ''] }, points: 0 };
    case 'ordering': return { ...base, questionData: { items: ['', ''], correctOrder: [0, 1] } };
  }
}

const QUIZ_PAGE_SIZE = 12;

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function DashboardPage() {
  const nav = useNavigate();
  const { teacher, token, logout } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'import'>('quizzes');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [quizType, setQuizType] = useState<'public' | 'private'>('public');
  const [published, setPublished] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([blankQuestion()]);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => { if (!teacher) nav('/auth'); }, [teacher, nav]);
  useEffect(() => { if (teacher) fetchQuizzes(1, false); }, [teacher]);

  async function fetchQuizzes(page: number, append: boolean) {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fetch(
        `${API}/teacher/quizzes/mine?page=${page}&limit=${QUIZ_PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const list: Quiz[] = Array.isArray(data.quizzes) ? data.quizzes : [];
      setQuizzes(prev => append ? [...prev, ...list] : list);
      setPagination(data.pagination ?? null);
      setCurrentPage(page);
    } catch {
      if (!append) setQuizzes([]);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }

  function loadMoreQuizzes() {
    fetchQuizzes(currentPage + 1, true);
  }

  async function deleteQuiz(id: string) {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    await fetch(`${API}/teacher/quizzes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    // Re-fetch page 1 to keep pagination state clean
    fetchQuizzes(1, false);
  }

  function startEdit(quiz: Quiz) {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setCategory(quiz.category || '');
    setQuizType(quiz.type || 'public');
    setPublished(quiz.published ?? true);
    setQuestions(quiz.questions.map(q => ({ ...q })));
    setCreateError('');
    setActiveTab('create');
  }

  function cancelEdit() {
    setEditingQuizId(null);
    setTitle('');
    setCategory('');
    setQuizType('public');
    setPublished(true);
    setQuestions([blankQuestion()]);
    setCreateError('');
  }

  async function saveQuiz(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!title.trim()) return setCreateError('Title is required');
    setCreateLoading(true);
    try {
      const isEdit = !!editingQuizId;
      const url = isEdit ? `${API}/teacher/quizzes/${editingQuizId}` : `${API}/teacher/quizzes`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, category, type: quizType, published, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelEdit();
      setActiveTab('quizzes');
      // Refresh page 1 so pagination totals stay accurate
      fetchQuizzes(1, false);
    } catch (err: any) { setCreateError(err.message); } finally { setCreateLoading(false); }
  }

  function updateQuestion(qi: number, updates: Partial<Question>) {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, ...updates } : q));
  }

  function changeQuestionType(qi: number, newType: QuestionType) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const fresh = blankQuestion(newType);
      return { ...fresh, text: q.text, timeLimit: q.timeLimit };
    }));
  }

  function updateQuestionData(qi: number, key: string, value: any) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, questionData: { ...q.questionData, [key]: value } };
    }));
  }

  function updateMcOption(qi: number, oi: number, value: string) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const opts = [...(q.questionData.options || [])];
      opts[oi] = value;
      return { ...q, questionData: { ...q.questionData, options: opts } };
    }));
  }

  function addMcOption(qi: number) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const opts = [...(q.questionData.options || []), ''];
      return { ...q, questionData: { ...q.questionData, options: opts } };
    }));
  }

  function removeMcOption(qi: number, oi: number) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const opts = (q.questionData.options || []).filter((_: any, j: number) => j !== oi);
      const ci = q.questionData.correctIndex >= oi ? Math.max(0, q.questionData.correctIndex - 1) : q.questionData.correctIndex;
      return { ...q, questionData: { ...q.questionData, options: opts, correctIndex: Math.min(ci, opts.length - 1) } };
    }));
  }

  function updateAcceptedAnswer(qi: number, ai: number, value: string) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const ans = [...(q.questionData.acceptedAnswers || [])];
      ans[ai] = value;
      return { ...q, questionData: { ...q.questionData, acceptedAnswers: ans } };
    }));
  }

  function updateOrderingItem(qi: number, ii: number, value: string) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q;
      const items = [...(q.questionData.items || [])];
      items[ii] = value;
      return { ...q, questionData: { ...q.questionData, items } };
    }));
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImportLoading(true); setImportResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API}/teacher/quizzes/import`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult({ imported: data.imported, errors: data.errors || [] });
      if (data.imported > 0) fetchQuizzes(1, false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) { setImportResult({ imported: 0, errors: [err.message] }); } finally { setImportLoading(false); }
  }

  if (!teacher) return null;

  // ── Question Type Editor ───────────────────────────────────────────────
  function renderQuestionEditor(q: Question, qi: number) {
    return (
      <motion.div key={qi} className="q-card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="q-card-header">
          <span className="q-num">Q{qi + 1}</span>
          <div className="q-type-selector">
            <select
              className="q-type-select"
              value={q.type}
              onChange={e => changeQuestionType(qi, e.target.value as QuestionType)}
            >
              {(Object.entries(TYPE_LABELS) as [QuestionType, typeof TYPE_LABELS[QuestionType]][]).map(([key, { label, icon }]) => (
                <option key={key} value={key}>{icon} {label}</option>
              ))}
            </select>
          </div>
          {questions.length > 1 && (
            <button type="button" className="q-delete" onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))}>✕</button>
          )}
        </div>

        <input className="input-field q-text-input" placeholder="Question text" value={q.text} onChange={e => updateQuestion(qi, { text: e.target.value })} required />

        {/* Type-specific editors */}
        <div className="q-type-editor">
          {q.type === 'multiple_choice' && (
            <>
              <div className="mc-options">
                {(q.questionData.options || []).map((opt: string, oi: number) => (
                  <div key={oi} className={`mc-option-row ${q.questionData.correctIndex === oi ? 'correct' : ''}`}>
                    <input
                      type="radio"
                      name={`mc-correct-${qi}`}
                      checked={q.questionData.correctIndex === oi}
                      onChange={() => updateQuestionData(qi, 'correctIndex', oi)}
                      title="Mark as correct"
                    />
                    <input className="input-field mc-opt-input" placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={e => updateMcOption(qi, oi, e.target.value)} required />
                    {q.questionData.correctIndex === oi && <span className="correct-badge">✓</span>}
                    {(q.questionData.options?.length || 0) > 2 && (
                      <button type="button" className="mc-remove-opt" onClick={() => removeMcOption(qi, oi)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              {(q.questionData.options?.length || 0) < 8 && (
                <button type="button" className="btn-add-option" onClick={() => addMcOption(qi)}>+ Add Option</button>
              )}
            </>
          )}

          {q.type === 'true_false' && (
            <div className="tf-editor">
              <label className="tf-label">Correct answer:</label>
              <div className="tf-toggle">
                <button type="button" className={`tf-btn ${q.questionData.correctAnswer === true ? 'active true' : ''}`} onClick={() => updateQuestionData(qi, 'correctAnswer', true)}>True</button>
                <button type="button" className={`tf-btn ${q.questionData.correctAnswer === false ? 'active false' : ''}`} onClick={() => updateQuestionData(qi, 'correctAnswer', false)}>False</button>
              </div>
            </div>
          )}

          {q.type === 'type_answer' && (
            <div className="ta-editor">
              <label className="ta-label">Accepted answers (any match counts):</label>
              {(q.questionData.acceptedAnswers || []).map((ans: string, ai: number) => (
                <div key={ai} className="ta-answer-row">
                  <input className="input-field" placeholder={`Answer ${ai + 1}`} value={ans} onChange={e => updateAcceptedAnswer(qi, ai, e.target.value)} required />
                  {(q.questionData.acceptedAnswers?.length || 0) > 1 && (
                    <button type="button" className="mc-remove-opt" onClick={() => {
                      const ans = [...(q.questionData.acceptedAnswers || [])];
                      ans.splice(ai, 1);
                      updateQuestionData(qi, 'acceptedAnswers', ans);
                    }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-add-option" onClick={() => updateQuestionData(qi, 'acceptedAnswers', [...(q.questionData.acceptedAnswers || []), ''])}>+ Add accepted answer</button>
              <label className="ta-case-label">
                <input type="checkbox" checked={q.questionData.caseSensitive || false} onChange={e => updateQuestionData(qi, 'caseSensitive', e.target.checked)} />
                Case sensitive
              </label>
            </div>
          )}

          {q.type === 'slider' && (
            <div className="slider-editor">
              <div className="slider-row">
                <div className="slider-field">
                  <label>Min</label>
                  <input type="number" className="input-field" value={q.questionData.min ?? 0} onChange={e => updateQuestionData(qi, 'min', Number(e.target.value))} />
                </div>
                <div className="slider-field">
                  <label>Max</label>
                  <input type="number" className="input-field" value={q.questionData.max ?? 100} onChange={e => updateQuestionData(qi, 'max', Number(e.target.value))} />
                </div>
                <div className="slider-field">
                  <label>Step</label>
                  <input type="number" className="input-field" value={q.questionData.step ?? 1} onChange={e => updateQuestionData(qi, 'step', Number(e.target.value))} />
                </div>
              </div>
              <div className="slider-row">
                <div className="slider-field">
                  <label>Correct Value</label>
                  <input type="number" className="input-field" value={q.questionData.correctValue ?? 50} onChange={e => updateQuestionData(qi, 'correctValue', Number(e.target.value))} />
                </div>
                <div className="slider-field">
                  <label>Tolerance (±)</label>
                  <input type="number" className="input-field" value={q.questionData.tolerance ?? 5} onChange={e => updateQuestionData(qi, 'tolerance', Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {q.type === 'poll' && (
            <>
              <div className="mc-options">
                {(q.questionData.options || []).map((opt: string, oi: number) => (
                  <div key={oi} className="mc-option-row poll-row">
                    <span className="poll-dot" />
                    <input className="input-field mc-opt-input" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateMcOption(qi, oi, e.target.value)} required />
                    {(q.questionData.options?.length || 0) > 2 && (
                      <button type="button" className="mc-remove-opt" onClick={() => removeMcOption(qi, oi)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              {(q.questionData.options?.length || 0) < 8 && (
                <button type="button" className="btn-add-option" onClick={() => addMcOption(qi)}>+ Add Option</button>
              )}
              <p className="poll-note">📊 No correct answer — results show vote distribution</p>
            </>
          )}

          {q.type === 'ordering' && (
            <div className="ordering-editor">
              <label className="ta-label">Items in correct order (players see them shuffled):</label>
              {(q.questionData.items || []).map((item: string, ii: number) => (
                <div key={ii} className="ordering-item-row">
                  <span className="ordering-num">{ii + 1}</span>
                  <input className="input-field" placeholder={`Item ${ii + 1}`} value={item} onChange={e => updateOrderingItem(qi, ii, e.target.value)} required />
                  {(q.questionData.items?.length || 0) > 2 && (
                    <button type="button" className="mc-remove-opt" onClick={() => {
                      const items = [...(q.questionData.items || [])];
                      items.splice(ii, 1);
                      const co = items.map((_: any, i: number) => i);
                      updateQuestion(qi, { questionData: { ...q.questionData, items, correctOrder: co } });
                    }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-add-option" onClick={() => {
                const items = [...(q.questionData.items || []), ''];
                const co = items.map((_: any, i: number) => i);
                updateQuestion(qi, { questionData: { ...q.questionData, items, correctOrder: co } });
              }}>+ Add Item</button>
            </div>
          )}
        </div>

        {/* Time + Points */}
        <div className="q-settings-row">
          <div className="q-setting">
            <label>Time limit</label>
            <select className="input-field q-select" value={q.timeLimit} onChange={e => updateQuestion(qi, { timeLimit: Number(e.target.value) })}>
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={20000}>20s</option>
              <option value={30000}>30s</option>
              <option value={45000}>45s</option>
              <option value={60000}>60s</option>
            </select>
          </div>
          <div className="q-setting">
            <label>Points</label>
            <select className="input-field q-select" value={q.points} onChange={e => updateQuestion(qi, { points: Number(e.target.value) })}>
              <option value={0}>0</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={1500}>1500</option>
              <option value={2000}>2000</option>
            </select>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => nav('/')}>
          <span className="sidebar-logo-icon">⚡</span>
          <span>QuizBlitz</span>
        </div>
        <div className="sidebar-teacher">
          <div className="teacher-avatar">{teacher.name[0].toUpperCase()}</div>
          <div>
            <div className="teacher-name">{teacher.name}</div>
            <div className="teacher-email">{teacher.email}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === 'quizzes' ? 'active' : ''} onClick={() => setActiveTab('quizzes')}>📋 My Quizzes</button>
          <button className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}>✏️ Create Quiz</button>
          <button onClick={() => nav('/quiz/ai-generate')}>✨ AI Generate</button>
          <button className={activeTab === 'import' ? 'active' : ''} onClick={() => setActiveTab('import')}>📥 Bulk Import</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-host-btn" onClick={() => nav('/host')}>🎓 Host a Game</button>
          <button className="sidebar-logout" onClick={logout}>Sign Out</button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="dashboard-main">
        {/* My Quizzes */}
        {activeTab === 'quizzes' && (
          <div className="tab-content">
            <div className="tab-header">
              <h1>My Quizzes</h1>
              <button className="btn-primary sm-btn" onClick={() => setActiveTab('create')}>+ Create Quiz</button>
            </div>
            {loading ? (
              <div className="loading-hint"><span className="loading-spinner" /> Loading quizzes…</div>
            ) : quizzes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No quizzes yet.</p>
                <p>Create one manually or <button onClick={() => setActiveTab('import')}>import from a file</button>.</p>
              </div>
            ) : (
              <>
                {pagination && (
                  <div className="quiz-list-pagination-info">
                    {quizzes.length} of {pagination.total} quizzes
                  </div>
                )}
                <div className="quiz-list">
                  {quizzes.map(q => (
                    <motion.div key={q.id} className="quiz-row" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="quiz-row-info">
                        <div className="quiz-row-title">{q.title}</div>
                        <div className="quiz-row-meta">
                          {q.category && <span className="cat-badge">{q.category}</span>}
                          <span className={`visibility-badge ${q.type === 'private' ? 'private' : 'public'}`}>
                            {q.type === 'private' ? '🔒 Private' : '🌐 Public'}
                          </span>
                          {!q.published && <span className="draft-badge">⊘ Draft</span>}
                          <span>{q.questions.length} questions</span>
                          {q.createdAt && <span>{new Date(q.createdAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="quiz-row-actions">
                        <button className="btn-edit" onClick={() => startEdit(q)}>✏️ Edit</button>
                        <button className="btn-host-quiz" onClick={() => nav('/host', { state: { preselect: q.id } })}>▶ Host</button>
                        <button className="btn-delete" onClick={() => deleteQuiz(q.id)}>🗑</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {pagination?.hasMore && (
                  <div className="quiz-load-more-row">
                    <button
                      className="quiz-load-more-btn"
                      onClick={loadMoreQuizzes}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <><span className="loading-spinner" /> Loading…</> : 'Load more quizzes'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Create Quiz */}
        {activeTab === 'create' && (
          <div className="tab-content">
            <div className="tab-header">
              <h1>{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h1>
              {editingQuizId && (
                <button className="btn-secondary" onClick={cancelEdit}>✕ Cancel Edit</button>
              )}
            </div>

            <form onSubmit={saveQuiz} className="create-form">
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
              <div className="form-row">
                <div className="field-group">
                  <label>Visibility</label>
                  <select className="input-field" value={quizType} onChange={e => setQuizType(e.target.value as 'public' | 'private')}>
                    <option value="public">🌐 Public — visible to everyone</option>
                    <option value="private">🔒 Private — only you can host</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Published</label>
                  <div className="published-toggle-row">
                    <button
                      type="button"
                      className={`toggle-btn ${published ? 'toggle-on' : 'toggle-off'}`}
                      onClick={() => setPublished(p => !p)}
                    >
                      {published ? '✓ Published' : '⊘ Draft'}
                    </button>
                    <span className="toggle-hint">
                      {published ? 'Visible in public listing' : 'Hidden from public listing'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="questions-header">
                <h3>Questions ({questions.length})</h3>
                <div className="add-q-dropdown">
                  <button type="button" className="btn-secondary" onClick={() => setQuestions(qs => [...qs, blankQuestion()])}>+ Add Question</button>
                </div>
              </div>

              <AnimatePresence>
                {questions.map((q, qi) => renderQuestionEditor(q, qi))}
              </AnimatePresence>

              {createError && <div className="error-banner">⚠ {createError}</div>}
              <button className="btn-primary" type="submit" disabled={createLoading}>
                {createLoading ? 'Saving…' : editingQuizId ? `Update Quiz (${questions.length} question${questions.length !== 1 ? 's' : ''})` : `Save Quiz (${questions.length} question${questions.length !== 1 ? 's' : ''})`}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Import */}
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
                  { label: 'JSON', icon: '{ }', ext: 'json', desc: 'Best for developers' },
                  { label: 'Excel', icon: '📊', ext: 'xlsx', desc: 'Open in Excel or Sheets' },
                  { label: 'CSV', icon: '📄', ext: 'csv', desc: 'Any spreadsheet app' },
                  { label: 'Text', icon: '📝', ext: 'docx', desc: 'Plain text format' },
                ].map(t => (
                  <a key={t.ext} href={`${API}/templates/${t.ext}`} className="template-card" download>
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
                <input ref={fileRef} type="file" accept=".json,.csv,.xlsx,.xls,.docx,.doc" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setImportResult(null)} />
              </div>
              <button className="btn-primary" onClick={handleImport} disabled={importLoading}>{importLoading ? 'Importing…' : '📥 Import Quizzes'}</button>
              {importResult && (
                <div className={`import-result ${importResult.imported > 0 ? 'success' : 'fail'}`}>
                  {importResult.imported > 0 && <div className="import-ok">✓ {importResult.imported} quiz{importResult.imported !== 1 ? 'zes' : ''} imported!</div>}
                  {importResult.errors.length > 0 && (
                    <div className="import-errors">
                      <div className="import-errors-title">⚠ Issues:</div>
                      {importResult.errors.map((e, i) => <div key={i} className="import-error-item">• {e}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
