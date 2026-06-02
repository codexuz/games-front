import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import './HomePage.css';

export default function HomePage() {
  const nav = useNavigate();
  const { teacher, logout } = useAuth();

  return (
    <div className="home-page">
      {/* Animated background */}
      <div className="home-bg-mesh" />
      <div className="home-particles" aria-hidden>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="home-particle"
            style={{
              left: `${(i * 5.3 + 2) % 100}%`,
              top: `${(i * 7.1 + 10) % 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${6 + (i % 5) * 2}s`,
              width: `${3 + (i % 4) * 2}px`,
              height: `${3 + (i % 4) * 2}px`,
            }}
          />
        ))}
      </div>

      <div className="home-content">
        {/* Logo */}
        <motion.div
          className="home-logo"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <div className="logo-glow" />
          <span className="logo-icon">⚡</span>
          <h1>QuizBlitz</h1>
          <p className="tagline">The ultimate real-time quiz platform</p>
        </motion.div>

        {/* Teacher bar */}
        {teacher ? (
          <motion.div
            className="teacher-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="teacher-bar-avatar">{teacher.name[0].toUpperCase()}</div>
            <span className="teacher-bar-name">{teacher.name}</span>
            <button className="teacher-bar-dash" onClick={() => nav('/dashboard')}>Dashboard</button>
            <button className="teacher-bar-out" onClick={logout}>Sign out</button>
          </motion.div>
        ) : (
          <motion.button
            className="teacher-signin-btn"
            onClick={() => nav('/auth')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            👩‍🏫 Teacher Sign In
          </motion.button>
        )}

        {/* Action buttons */}
        <div className="home-buttons">
          <motion.button
            className="home-action-btn host"
            onClick={() => nav('/host')}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: 'spring' }}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="action-icon-wrap host">
              <span className="action-icon">🎓</span>
            </div>
            <div className="action-text">
              <div className="action-title">Host a Game</div>
              <div className="action-sub">Create or pick a quiz and invite players</div>
            </div>
            <span className="action-arrow">→</span>
          </motion.button>

          <motion.button
            className="home-action-btn join"
            onClick={() => nav('/join')}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: 'spring' }}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="action-icon-wrap join">
              <span className="action-icon">🎮</span>
            </div>
            <div className="action-text">
              <div className="action-title">Join a Game</div>
              <div className="action-sub">Enter a PIN to join a live session</div>
            </div>
            <span className="action-arrow">→</span>
          </motion.button>

          <motion.button
            className="home-action-btn contest"
            onClick={() => nav('/contest')}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring' }}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="action-icon-wrap contest">
              <span className="action-icon">⚔️</span>
            </div>
            <div className="action-text">
              <div className="action-title">1v1 Contest</div>
              <div className="action-sub">Challenge a friend, no host needed</div>
            </div>
            <span className="action-arrow">→</span>
          </motion.button>
        </div>

        {/* Question types showcase */}
        <motion.div
          className="home-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="feature-chip">✨ Multiple Choice</div>
          <div className="feature-chip">✅ True / False</div>
          <div className="feature-chip">⌨️ Type Answer</div>
          <div className="feature-chip">📊 Polls</div>
          <div className="feature-chip">🎚️ Slider</div>
          <div className="feature-chip">📋 Ordering</div>
        </motion.div>
      </div>
    </div>
  );
}
