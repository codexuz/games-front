import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import './AuthPage.css';

export default function AuthPage() {
  const nav = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(name, email, password);
      }
      nav('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-mesh" />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="auth-logo">
          <span className="auth-logo-icon">⚡</span>
          <span className="auth-logo-text">QuizBlitz</span>
        </div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create Account'}</h2>
        <p className="auth-sub">
          {mode === 'login' ? 'Sign in to manage your quizzes' : 'Register as a teacher to create quizzes'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <motion.div className="field-group" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
              <label>Full Name</label>
              <input className="input-field" type="text" placeholder="Ms. Johnson" value={name} onChange={e => setName(e.target.value)} required />
            </motion.div>
          )}
          <div className="field-group">
            <label>Email</label>
            <input className="input-field" type="email" placeholder="teacher@school.edu" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field-group">
            <label>Password</label>
            <input className="input-field" type="password" placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <motion.div className="auth-error" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
              ⚠ {error}
            </motion.div>
          )}

          <button className="btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <span className="auth-loading">
                <span className="auth-spinner" />
                Please wait…
              </span>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('register'); setError(''); }}>Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }}>Sign In</button></>
          )}
        </div>

        <button className="auth-back" onClick={() => nav('/')}>← Back to Home</button>
      </motion.div>
    </div>
  );
}
