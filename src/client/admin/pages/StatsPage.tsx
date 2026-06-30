import { triggerManualCleanup, type AdminStats } from '../api/admin';
import { useState } from 'react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export function StatsPage({
  stats,
  error,
  onNavigate,
}: {
  stats: AdminStats | null;
  error: string | null;
  onNavigate: (path: string) => void;
}) {
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  const handleCleanup = async () => {
    if (!confirm('Run storage cleanup now? This will delete expired session files.')) return;
    setCleaning(true);
    setCleanResult('Running...');
    try {
      const res = await triggerManualCleanup();
      setCleanResult(`Cleanup completed! Removed ${res.sessionsRemoved} sessions and ${res.filesRemoved} files.`);
      setTimeout(() => setCleanResult(null), 5000);
    } catch {
      setCleanResult('Cleanup failed');
      setTimeout(() => setCleanResult(null), 5000);
    } finally {
      setCleaning(false);
    }
  };
  if (error) {
    return (
      <div className="page">
        <h2 className="page-title">Dashboard</h2>
        <div className="page-error">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page">
        <h2 className="page-title">Dashboard</h2>
        <div className="page-loading">Loading stats...</div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Sessions', value: stats.totalSessions, onClick: () => onNavigate('/admin/sessions') },
    { label: 'Active Sessions', value: stats.activeSessions, subtitle: 'not expired' },
    { label: 'Today', value: stats.todaySessions, subtitle: 'sessions created' },
    { label: 'Legacy Photos', value: stats.totalPhotos },
    { label: 'Print Files', value: stats.printFiles, subtitle: 'on disk' },
    { label: 'Storage Used', value: formatBytes(stats.storageBytes) },
    { label: 'Database Size', value: formatBytes(stats.dbSizeBytes) },
    { label: 'Uptime', value: formatUptime(stats.uptime) },
  ];

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Dashboard</h2>
          <span className="page-subtitle">System overview</span>
        </div>
        <button
          className="btn-secondary"
          onClick={handleCleanup}
          disabled={cleaning}
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
        >
          {cleaning ? 'Cleaning...' : 'Run Storage Cleanup'}
        </button>
      </div>

      {cleanResult && (
        <div style={{ background: 'var(--surface-2)', padding: '12px 16px', border: '2px solid var(--border)', marginBottom: 20, fontSize: '0.9rem' }}>
          {cleanResult}
        </div>
      )}

      <div className="stats-grid">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`stat-card${card.onClick ? ' stat-clickable' : ''}`}
            onClick={card.onClick}
          >
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            {card.subtitle && <div className="stat-subtitle">{card.subtitle}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
