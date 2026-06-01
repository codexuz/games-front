import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

export default function HomePage() {
  const nav = useNavigate();
  const { teacher, logout } = useAuth();

  return (
    <div className="home-page">
      <div className="home-stars" />
      <div className="home-content">
        <div className="home-logo">
          <span className="logo-icon">⚡</span>
          <h1>QuizBlitz</h1>
          <p className="tagline">The ultimate real-time quiz game</p>
        </div>

        {/* Teacher bar */}
        {teacher ? (
          <div className="teacher-bar">
            <span>👩‍🏫 {teacher.name}</span>
            <button className="teacher-bar-dash" onClick={() => nav('/dashboard')}>Dashboard</button>
            <button className="teacher-bar-out" onClick={logout}>Sign out</button>
          </div>
        ) : (
          <button className="teacher-signin-btn" onClick={() => nav('/auth')}>
            👩‍🏫 Teacher Sign In
          </button>
        )}

        <div className="home-buttons">
          <button className="btn-host" onClick={() => nav('/host')}>
            <span className="btn-icon">🎓</span>
            <div>
              <div className="btn-title">Host a Game</div>
              <div className="btn-sub">Create or pick a quiz and invite players</div>
            </div>
          </button>

          <button className="btn-player" onClick={() => nav('/join')}>
            <span className="btn-icon">🎮</span>
            <div>
              <div className="btn-title">Join a Game</div>
              <div className="btn-sub">Enter a PIN to join a live session</div>
            </div>
          </button>

          <button className="btn-contest" onClick={() => nav('/contest')}>
            <span className="btn-icon">⚔️</span>
            <div>
              <div className="btn-title">1v1 Contest</div>
              <div className="btn-sub">Challenge a friend, no host needed</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
