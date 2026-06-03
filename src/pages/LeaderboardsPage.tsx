import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './LeaderboardsPage.css';

const API = import.meta.env.VITE_API_URL;

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  quizTitle: string;
  category?: string;
  achievedAt: string;
}

interface RecentWinner {
  sessionId: string;
  quizTitle: string;
  category: string;
  winner: string;
  winnerScore: number;
  playerCount: number;
  playedAt: string;
}

export default function LeaderboardsPage() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<'global' | 'recent'>('global');
  const [globalLeaders, setGlobalLeaders] = useState<LeaderboardEntry[]>([]);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'global') {
      fetch(`${API}/leaderboard/global?limit=20`)
        .then(r => r.json())
        .then(data => setGlobalLeaders(data.leaderboard || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch(`${API}/leaderboard/recent?limit=20`)
        .then(r => r.json())
        .then(data => setRecentWinners(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const topThree = globalLeaders.slice(0, 3);
  const rest = globalLeaders.slice(3);

  // Helper for podium placement
  const getPodiumOrder = () => {
    if (topThree.length === 0) return [];
    if (topThree.length === 1) return [topThree[0]];
    if (topThree.length === 2) return [topThree[1], topThree[0]];
    return [topThree[1], topThree[0], topThree[2]]; // 2nd, 1st, 3rd
  };

  return (
    <div className="leaderboards-wrapper">
      <header className="lb-header-bar">
        <div className="lb-logo" onClick={() => nav('/')}>
          ⚡ QuizBlitz
        </div>
        <nav className="lb-nav">
          <button className="lb-btn-home" onClick={() => nav('/')}>Home</button>
          <button className="lb-btn-dash" onClick={() => nav('/dashboard')}>Dashboard</button>
        </nav>
      </header>

      <main className="lb-main">
        <div className="lb-title-section">
          <h1>🏆 Hall of Fame</h1>
          <p>The top players and most recent victors across the globe.</p>
        </div>

        <div className="lb-tabs">
          <button 
            className={`lb-tab ${activeTab === 'global' ? 'active' : ''}`} 
            onClick={() => setActiveTab('global')}
          >
            🌍 Global Top Scores
          </button>
          <button 
            className={`lb-tab ${activeTab === 'recent' ? 'active' : ''}`} 
            onClick={() => setActiveTab('recent')}
          >
            ⏱️ Recent Winners
          </button>
        </div>

        {loading ? (
          <div className="lb-loading">
            <div className="lb-spinner"></div> Loading rankings...
          </div>
        ) : (
          <div className="lb-content">
            {activeTab === 'global' && (
              <>
                {topThree.length > 0 && (
                  <div className="podium-container">
                    {getPodiumOrder().map((leader) => {
                      const isFirst = leader.rank === 1;
                      const isSecond = leader.rank === 2;
                      
                      
                      return (
                        <motion.div 
                          key={leader.rank} 
                          className={`podium-spot rank-${leader.rank}`}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: leader.rank * 0.1 }}
                        >
                          <div className="podium-avatar">
                            {isFirst ? '👑' : isSecond ? '🥈' : '🥉'}
                          </div>
                          <div className="podium-name">{leader.playerName}</div>
                          <div className="podium-score">{leader.score.toLocaleString()} pts</div>
                          <div className="podium-bar">
                            <span className="podium-rank-num">{leader.rank}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="lb-table-container">
                  <table className="lb-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Accuracy</th>
                        <th>Quiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((r, i) => (
                        <motion.tr 
                          key={r.rank}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <td className="rank-col">#{r.rank}</td>
                          <td className="player-col">{r.playerName}</td>
                          <td className="score-col">{r.score.toLocaleString()}</td>
                          <td className="acc-col">{r.accuracy}%</td>
                          <td className="quiz-col">{r.quizTitle}</td>
                        </motion.tr>
                      ))}
                      {globalLeaders.length === 0 && (
                        <tr><td colSpan={5} className="lb-empty">No scores recorded yet. Be the first!</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'recent' && (
              <div className="lb-grid">
                {recentWinners.map((w, i) => (
                  <motion.div 
                    key={w.sessionId} 
                    className="recent-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="recent-badge">Winner</div>
                    <div className="recent-winner-name">{w.winner}</div>
                    <div className="recent-winner-score">{w.winnerScore.toLocaleString()} pts</div>
                    <div className="recent-divider"></div>
                    <div className="recent-meta">
                      <span><strong>Quiz:</strong> {w.quizTitle}</span>
                      <span><strong>Players:</strong> {w.playerCount}</span>
                      <span><strong>When:</strong> {new Date(w.playedAt).toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
                {recentWinners.length === 0 && (
                  <div className="lb-empty">No recent games found.</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
