import { useState } from 'react';
import { storage } from '../lib/storage.js';
import UploadPanel from './UploadPanel.jsx';

function formatRelTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function VersionChip({ version, isActive, onClick }) {
  return (
    <button
      className={`version-chip ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`v${version.versionNumber} · ${version.sourceFilename} · ${new Date(version.timestamp).toLocaleString()}`}
      id={`version-chip-${version.versionNumber}`}
    >
      <span className="v-num">v{version.versionNumber}</span>
      <span className="v-time">{formatRelTime(version.timestamp)}</span>
    </button>
  );
}

function RunItem({ run, activeRunId, activeVersionNum, onSelectVersion, onDelete, onRename, onRefresh }) {
  const [expanded, setExpanded] = useState(run.id === activeRunId);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(run.name);
  const isActive = run.id === activeRunId;

  function handleRename() {
    if (newName.trim() && newName !== run.name) {
      storage.renameRun(run.id, newName.trim());
      onRename?.();
    }
    setRenaming(false);
  }

  const sortedVersions = [...run.versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className={`run-item ${isActive ? 'active' : ''}`}>
      <div className="run-item-header" onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              onClick={e => e.stopPropagation()}
              autoFocus
              style={{ padding: '3px 8px', fontSize: '0.82rem' }}
            />
          ) : (
            <div className="run-name truncate">{run.name}</div>
          )}
          <div className="run-meta-sm">
            {run.versions.length} version{run.versions.length !== 1 ? 's' : ''} · {formatRelTime(run.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            title="Rename run"
            id={`rename-run-${run.id}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={(e) => { e.stopPropagation(); if (confirm(`Delete run "${run.name}"?`)) { storage.deleteRun(run.id); onDelete?.(); } }}
            title="Delete run"
            id={`delete-run-${run.id}`}
            style={{ color: 'var(--diff-removed)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
          <svg className={`accordion-icon ${expanded ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="version-list">
          {sortedVersions.map(v => (
            <div key={v.versionNumber} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <VersionChip
                version={v}
                isActive={isActive && activeVersionNum === v.versionNumber}
                onClick={() => onSelectVersion(run, v)}
              />
              {run.versions.length > 1 && (
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => {
                    if (confirm(`Delete v${v.versionNumber}?`)) {
                      storage.deleteVersion(run.id, v.versionNumber);
                      onRefresh?.();
                    }
                  }}
                  title="Delete version"
                  style={{ color: 'var(--text-muted)', width: 22, height: 22, flexShrink: 0 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RunSidebar({ activeRunId, activeVersionNum, onSelectVersion, onRefresh }) {
  const [runs, setRuns] = useState(() => storage.listRuns());

  function refresh() {
    setRuns(storage.listRuns());
    onRefresh?.();
  }

  const handleSelectVersion = (run, version) => {
    onSelectVersion?.(run, version);
  };

  return (
    <div className="sidebar-inner">
      <div className="sidebar-section-label">Upload</div>
      <UploadPanel onUploadComplete={(run) => { refresh(); onSelectVersion?.(run, run.versions.at(-1)); }} />

      <div style={{ marginTop: 'var(--space-5)' }}>
        <div className="sidebar-section-label">Runs</div>
        {runs.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
            Upload a JSON file to get started
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {runs.map(run => (
              <RunItem
                key={run.id}
                run={run}
                activeRunId={activeRunId}
                activeVersionNum={activeVersionNum}
                onSelectVersion={handleSelectVersion}
                onDelete={refresh}
                onRename={refresh}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .sidebar-inner { padding: var(--space-3); height: 100%; display: flex; flex-direction: column; }
        .sidebar-section-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: var(--space-2) var(--space-1);
          margin-bottom: var(--space-1);
        }
        .run-item {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color var(--transition-fast);
        }
        .run-item.active { border-color: var(--primary); background: var(--primary-dim); }
        .run-item:hover { border-color: var(--border); }
        .run-item-header {
          display: flex;
          align-items: center;
          gap: 6;
          padding: var(--space-3) var(--space-3);
          cursor: pointer;
          user-select: none;
          transition: background var(--transition-fast);
        }
        .run-item-header:hover { background: var(--bg-hover); }
        .run-name { font-size: 0.83rem; font-weight: 600; color: var(--text-primary); }
        .run-meta-sm { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }
        .version-list {
          padding: 6px var(--space-3) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-top: 1px solid var(--border-subtle);
        }
        .version-chip {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font);
        }
        .version-chip:hover { background: var(--bg-hover); border-color: var(--border); }
        .version-chip.active { background: var(--primary); border-color: var(--primary); }
        .version-chip .v-num { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); }
        .version-chip.active .v-num, .version-chip.active .v-time { color: white; }
        .version-chip .v-time { font-size: 0.68rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
