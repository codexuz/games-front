import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './LeaderboardsPage.css';

const API = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 20;

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function LeaderboardsPage() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<'global' | 'recent'>('global');

  // Global leaderboard state
  const [globalLeaders, setGlobalLeaders] = useState<LeaderboardEntry[]>([]);
  const [globalPagination, setGlobalPagination] = useState<Pagination | null>(null);
  const [globalPage, setGlobalPage] = useState(1);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMore, setGlobalLoadingMore] = useState(false);

  // Recent winners state
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [recentPagination, setRecentPagination] = useState<Pagination | null>(null);
  const [recentPage, setRecentPage] = useState(1);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentLoadingMore, setRecentLoadingMore] = useState(false);

  // Track if first load for each tab
  const globalFetched = useRef(false);
  const recentFetched = useRef(false);

  const fetchGlobal = useCallback(async (page: number, append: boolean) => {
    if (append) setGlobalLoadingMore(true); else setGlobalLoading(true);
    try {
      const r = await fetch(`${API}/leaderboard/global?page=${page}&limit=${PAGE_SIZE}`);
      const data = await r.json();
      setGlobalLeaders(prev => append ? [...prev, ...(data.leaderboard || [])] : (data.leaderboard || []));
      setGlobalPagination(data.pagination ?? null);
    } catch { /* swallow */ } finally {
      if (append) setGlobalLoadingMore(false); else setGlobalLoading(false);
    }
  }, []);

  const fetchRecent = useCallback(async (page: number, append: boolean) => {
    if (append) setRecentLoadingMore(true); else setRecentLoading(true);
    try {
      const r = await fetch(`${API}/leaderboard/recent?page=${page}&limit=${PAGE_SIZE}`);
      const data = await r.json();
      setRecentWinners(prev => append ? [...prev, ...(data.recent || [])] : (data.recent || []));
      setRecentPagination(data.pagination ?? null);
    } catch { /* swallow */ } finally {
      if (append) setRecentLoadingMore(false); else setRecentLoading(false);
    }
  }, []);

  // Initial load when tab first becomes active
  useEffect(() => {
    if (activeTab === 'global' && !globalFetched.current) {
      globalFetched.current = true;
      fetchGlobal(1, false);
    }
    if (activeTab === 'recent' && !recentFetched.current) {
      recentFetched.current = true;
      fetchRecent(1, false);
    }
  }, [activeTab, fetchGlobal, fetchRecent]);

  function loadMoreGlobal() {
    const next = globalPage + 1;
    setGlobalPage(next);
    fetchGlobal(next, true);
  }

  function loadMoreRecent() {
    const next = recentPage + 1;
    setRecentPage(next);
    fetchRecent(next, true);
  }

  const topThree = globalLeaders.slice(0, 3);
  const rest = globalLeaders.slice(3);

  function getPodiumOrder() {
    if (topThree.length === 0) return [];
    if (topThree.length === 1) return [topThree[0]];
    if (topThree.length === 2) return [topThree[1], topThree[0]];
    return [topThree[1], topThree[0], topThree[2]];
  }

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

        <div className="lb-content">
          {/* ── Global tab ── */}
          {activeTab === 'global' && (
            <>
              {globalLoading ? (
                <div className="lb-loading"><div className="lb-spinner" /> Loading rankings...</div>
              ) : (
                <>
                  {topThree.length > 0 && (
                    <div className="podium-container">
                      {getPodiumOrder().map(leader => (
                        <motion.div
                          key={leader.rank}
                          className={`podium-spot rank-${leader.rank}`}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: leader.rank * 0.1 }}
                        >
                          <div className="podium-avatar">
                            {leader.rank === 1 ? '👑' : leader.rank === 2 ? '🥈' : '🥉'}
                          </div>
                          <div className="podium-name">{leader.playerName}</div>
                          <div className="podium-score">{leader.score.toLocaleString()} pts</div>
                          <div className="podium-bar">
                            <span className="podium-rank-num">{leader.rank}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="lb-table-container">
                    {globalPagination && (
                      <div className="lb-pagination-info">
                        Showing {globalLeaders.length} of {globalPagination.total} players
                      </div>
                    )}
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
                            transition={{ delay: Math.min(i, 10) * 0.04 }}
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

                  {globalPagination?.hasMore && (
                    <div className="lb-load-more-row">
                      <button
                        className="lb-load-more-btn"
                        onClick={loadMoreGlobal}
                        disabled={globalLoadingMore}
                      >
                        {globalLoadingMore ? <><span className="lb-spinner-sm" /> Loading…</> : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Recent tab ── */}
          {activeTab === 'recent' && (
            <>
              {recentLoading ? (
                <div className="lb-loading"><div className="lb-spinner" /> Loading recent games...</div>
              ) : (
                <>
                  {recentPagination && (
                    <div className="lb-pagination-info">
                      Showing {recentWinners.length} of {recentPagination.total} sessions
                    </div>
                  )}
                  <div className="lb-grid">
                    {recentWinners.map((w, i) => (
                      <motion.div
                        key={w.sessionId}
                        className="recent-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(i, 10) * 0.04 }}
                      >
                        <div className="recent-badge">Winner</div>
                        <div className="recent-winner-name">{w.winner}</div>
                        <div className="recent-winner-score">{w.winnerScore.toLocaleString()} pts</div>
                        <div className="recent-divider" />
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

                  {recentPagination?.hasMore && (
                    <div className="lb-load-more-row">
                      <button
                        className="lb-load-more-btn"
                        onClick={loadMoreRecent}
                        disabled={recentLoadingMore}
                      >
                        {recentLoadingMore ? <><span className="lb-spinner-sm" /> Loading…</> : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
