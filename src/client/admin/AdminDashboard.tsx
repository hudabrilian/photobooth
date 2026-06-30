import { useState, useEffect, useCallback } from 'react';
import { fetchStats, fetchSessionDetail, deleteSession, reprintSession, connectSSE, type AdminStats, type AdminSessionRow } from './api/admin';
import { StatsPage } from './pages/StatsPage';
import { SessionsPage } from './pages/SessionsPage';

type Route =
  | { page: 'stats' }
  | { page: 'sessions' }
  | { page: 'detail'; sessionId: string };

function parsePath(pathname: string): Route {
  const match = pathname.match(/^\/admin\/sessions\/(.+)$/);
  if (match) return { page: 'detail', sessionId: match[1] };
  if (pathname === '/admin/sessions') return { page: 'sessions' };
  return { page: 'stats' };
}

export function AdminDashboard() {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname));
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
    setRoute(parsePath(path));
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchStats();
        setStats(data);
        setError(null);
      } catch {
        setError('Failed to load stats');
      }
    };

    loadStats();
    const pollTimer = setInterval(loadStats, 5000);

    const sse = connectSSE({
      onStats: (data) => {
        setStats(data);
        setError(null);
      },
      onSessions: () => {},
    });

    return () => {
      clearInterval(pollTimer);
      sse.abort();
    };
  }, []);

  const handleViewSession = (sessionId: string) => {
    navigate(`/admin/sessions/${sessionId}`);
  };

  const isStatsActive = route.page === 'stats';
  const isSessionsActive = route.page === 'sessions' || route.page === 'detail';

  const renderPage = () => {
    switch (route.page) {
      case 'stats':
        return <StatsPage stats={stats} error={error} onNavigate={navigate} />;
      case 'sessions':
        return <SessionsPage onViewSession={handleViewSession} onNavigate={navigate} />;
      case 'detail':
        return <SessionDetailPage sessionId={route.sessionId} onBack={() => navigate('/admin/sessions')} />;
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h1>snapbooth</h1>
          <span className="admin-brand-badge">admin</span>
        </div>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item${isStatsActive ? ' active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <span className="nav-icon">&#9632;</span>
            Dashboard
          </button>
          <button
            className={`admin-nav-item${isSessionsActive ? ' active' : ''}`}
            onClick={() => navigate('/admin/sessions')}
          >
            <span className="nav-icon">&#9776;</span>
            Sessions
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" className="admin-back-link">&larr; Back to SnapBooth</a>
        </div>
      </aside>
      <main className="admin-content">
        {renderPage()}
      </main>
    </div>
  );
}

function SessionDetailPage({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [session, setSession] = useState<AdminSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [reprintMsg, setReprintMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionDetail(sessionId).then(setSession).catch(() => setDeleteMsg('Session not found'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleDelete = async () => {
    if (!confirm('Delete this session and all its files?')) return;
    try {
      await deleteSession(sessionId);
      onBack();
    } catch {
      setDeleteMsg('Delete failed');
    }
  };

  const handleReprint = async () => {
    setReprintMsg('Sending...');
    try {
      const result = await reprintSession(sessionId);
      setReprintMsg(result.message);
    } catch {
      setReprintMsg('Reprint failed');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!session) return <div className="page-error">Session not found. <button onClick={onBack}>Go back</button></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>&larr; Back</button>
        <h2 className="page-title">Session Detail</h2>
      </div>

      <div className="detail-meta">
        <div className="meta-group">
          <label>Session ID</label>
          <code>{session.session_id}</code>
        </div>
        <div className="meta-group">
          <label>Created</label>
          <span>{new Date(session.created_at).toLocaleString()}</span>
        </div>
        <div className="meta-group">
          <label>Expires</label>
          <span className={session.expired ? 'status-expired' : 'status-active'}>
            {session.expired ? 'EXPIRED' : new Date(session.expires_at).toLocaleString()}
          </span>
        </div>
        {session.name && <div className="meta-group"><label>Name</label><span>{session.name}</span></div>}
        {session.wa && <div className="meta-group"><label>WA</label><span>{session.wa}</span></div>}
        {session.email && <div className="meta-group"><label>Email</label><span>{session.email}</span></div>}
        {session.template && <div className="meta-group"><label>Template</label><span>{session.template}</span></div>}
        {session.filter_text && <div className="meta-group"><label>Filter</label><span>{session.filter_text}</span></div>}
      </div>

      <div className="detail-previews">
        <div className="preview-card">
          <h3>Composed Photo</h3>
          <img src={session.composed_url} alt="Composed" />
        </div>
        {session.gif_url && (
          <div className="preview-card">
            <h3>GIF</h3>
            <img src={session.gif_url} alt="GIF" />
          </div>
        )}
        {session.video_url && (
          <div className="preview-card">
            <h3>Behind the Scenes Video</h3>
            <video src={session.video_url} autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} />
          </div>
        )}
        {session.photos.map((url, i) => (
          <div className="preview-card" key={url}>
            <h3>Photo {i + 1}</h3>
            <img src={url} alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>

      <div className="detail-actions">
        <button className="btn-primary" onClick={handleReprint} disabled={reprintMsg === 'Sending...'}>
          {reprintMsg === 'Sending...' ? 'Printing...' : 'Reprint'}
        </button>
        <a
          href={`/view/${session.session_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center', padding: '10px 20px' }}
        >
          View Session
        </a>
        <button className="btn-danger" onClick={handleDelete}>
          Delete Session
        </button>
      </div>

      {reprintMsg && reprintMsg !== 'Sending...' && <p className="msg-info">{reprintMsg}</p>}
      {deleteMsg && <p className="msg-info">{deleteMsg}</p>}
    </div>
  );
}
