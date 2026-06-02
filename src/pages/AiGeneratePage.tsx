import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import './AiGeneratePage.css';

const API = 'http://localhost:3001/api';

export default function AiGeneratePage() {
  const nav = useNavigate();
  const { token } = useAuth();
  
  const [prompt, setPrompt] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState('');

  // Submit job
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      setStatus('pending');
      setError('');
      
      const res = await fetch(`${API}/ai/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to submit job');
      setJobId(data.jobId);
    } catch (err: any) {
      setError(err.message);
      setStatus('failed');
    }
  };

  // Poll job status
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/ai/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.status === 'completed') {
          setStatus('completed');
          setTimeout(() => nav('/dashboard'), 1500); // Redirect to dashboard
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error || 'Generation failed');
        } else {
          setStatus(data.status); // pending or processing
        }
      } catch (err) {
        // Silently ignore network errors during polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status, nav, token]);

  const isGenerating = status === 'pending' || status === 'processing';

  return (
    <div className="ai-page-wrapper">
      <button className="ai-back-btn" onClick={() => nav('/dashboard')}>← Back to Dashboard</button>
      
      <main className="ai-container">
        <div className="ai-header">
          <div className="ai-icon">✨</div>
          <h1>Generate with AI</h1>
          <p>Describe your topic, paste a text, or list some keywords to create a full quiz instantly.</p>
        </div>

        <div className="ai-input-card">
          <textarea
            className="ai-textarea"
            placeholder="e.g. A difficult quiz about the history of the Roman Empire, focusing on Julius Caesar..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isGenerating || status === 'completed'}
            rows={5}
          />
          
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="ai-error">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            className={`ai-submit-btn ${isGenerating ? 'generating' : ''}`}
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating || status === 'completed'}
          >
            {status === 'completed' ? '✨ Done! Redirecting...' : isGenerating ? 'Generating...' : 'Generate Quiz ✨'}
          </button>
        </div>

        <AnimatePresence>
          {isGenerating && (
            <motion.div 
              className="ai-status-box"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="ai-spinner"></div>
              <div className="ai-status-text">
                {status === 'pending' ? 'Queued for generation...' : 'AI is writing your questions...'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
