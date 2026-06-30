import { useState, useEffect, useCallback } from 'react';
import { fetchSessions, type AdminSessionRow, type PaginatedResult } from '../api/admin';

export function SessionsPage({
  onViewSession,
  onNavigate,
}: {
  onViewSession: (sessionId: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [data, setData] = useState<PaginatedResult | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSessions(page, 20, search || undefined);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-back" onClick={() => onNavigate('/admin')}>&larr; Back</button>
          <h2 className="page-title" style={{ margin: 0 }}>Sessions</h2>
        </div>
        <a
          href="/api/admin/export"
          className="btn-secondary"
          download="sessions.csv"
          style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '0.9rem', display: 'inline-block' }}
        >
          Export to CSV
        </a>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by name, WA, email, or session ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-primary">Search</button>
        {search && (
          <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      {loading && <div className="page-loading">Loading...</div>}

      {data && (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>WA</th>
                  <th>Template</th>
                  <th>Filter</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.length === 0 && (
                  <tr><td colSpan={7} className="table-empty">No sessions found</td></tr>
                )}
                {data.sessions.map((s) => (
                  <tr key={s.session_id}>
                    <td>{s.name || '—'}</td>
                    <td>{s.wa || '—'}</td>
                    <td>{s.template || '—'}</td>
                    <td>{s.filter_text || '—'}</td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>
                      <span className={s.expired ? 'status-expired' : 'status-active'}>
                        {s.expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => onViewSession(s.session_id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &larr; Prev
            </button>
            <span className="page-info">
              Page {data.page} of {data.pages} ({data.total} total)
            </span>
            <button
              className="btn-secondary"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
}
