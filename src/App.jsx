import { useState, useMemo, useRef, useEffect } from 'react';
import './App.css';
import { storage } from './lib/storage.js';
import { diffDocuments, getDiffChild } from './lib/diff.js';
import { classifyTopLevelKeys, PIPELINE_STAGES } from './lib/schema.js';
import SituationalAnalysis from './components/SituationalAnalysis/index.jsx';
import InsightRows from './components/InsightRows.jsx';
import StrategicImperatives from './components/StrategicImperatives.jsx';
import DiffView from './components/DiffView.jsx';
import GenericTree from './components/GenericTree.jsx';
import DiffBadge from './components/DiffBadge.jsx';
import UploadPanel from './components/UploadPanel.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRelTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Topbar Upload Button (compact) ────────────────────────────────────────────
function TopbarUpload({ onUploadComplete }) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Global drag-over listener to detect files dragged onto the window
  useEffect(() => {
    const onDragEnter = (e) => { if (e.dataTransfer.types.includes('Files')) setOpen(true); };
    window.addEventListener('dragenter', onDragEnter);
    return () => window.removeEventListener('dragenter', onDragEnter);
  }, []);

  return (
    <>
      <button
        className="topbar-upload-btn"
        onClick={() => setOpen(true)}
        id="topbar-upload-btn"
        title="Upload JSON file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        Upload JSON
      </button>

      {open && (
        <div
          className="upload-drop-overlay"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="upload-drop-box">
            <div style={{ fontSize: '2.5rem', color: 'var(--primary-light)' }}>⬆️</div>
            <h2 style={{ fontSize: '1.2rem' }}>Upload JSON File</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Drag a file here, or use the picker below
            </p>
            <UploadPanel onUploadComplete={(run) => { setOpen(false); onUploadComplete?.(run); }} />
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} style={{ marginTop: 8 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Run selector dropdown ─────────────────────────────────────────────────────
function RunSelector({ runs, activeRunId, onSelectRun, onDeleteRun }) {
  if (runs.length === 0) return null;
  return (
    <div className="run-selector-wrap">
      <span className="run-selector-label">Run:</span>
      <select
        className="select"
        value={activeRunId ?? ''}
        onChange={e => {
          const run = runs.find(r => r.id === e.target.value);
          if (run) onSelectRun(run);
        }}
        id="run-selector"
        style={{ width: 'auto', maxWidth: 200, padding: '4px 28px 4px 10px', fontSize: '0.82rem' }}
      >
        {runs.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <button
        className="btn btn-ghost btn-icon"
        style={{ width: 26, height: 26, padding: 0, color: 'var(--text-muted)' }}
        onClick={() => {
          if (confirm('Delete this entire run and all its versions?')) {
            onDeleteRun(activeRunId);
          }
        }}
        title="Delete run"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}

// ── Version chips strip ───────────────────────────────────────────────────────
function VersionStrip({ run, activeVersionNum, onVersionChange, onDeleteVersion }) {
  if (!run || run.versions.length === 0) return null;
  const sorted = [...run.versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const activeIndex = sorted.findIndex(v => v.versionNumber === activeVersionNum);

  return (
    <div className="version-strip">
      <span className="version-strip-label">Ver:</span>
      {/* Prev */}
      <button
        className="btn btn-ghost btn-icon"
        style={{ width: 26, height: 26, padding: 0 }}
        disabled={activeIndex <= 0}
        onClick={() => onVersionChange(sorted[activeIndex - 1])}
        title="Previous version"
        id="prev-version-btn"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      {/* Chips */}
      {sorted.map(v => (
        <button
          key={v.versionNumber}
          className={`topbar-version-chip ${activeVersionNum === v.versionNumber ? 'active' : ''}`}
          onClick={() => onVersionChange(v)}
          id={`version-chip-${v.versionNumber}`}
          title={`${v.sourceFilename} · ${new Date(v.timestamp).toLocaleString()}`}
        >
          v{v.versionNumber}
          <span style={{ opacity: 0.7, fontSize: '0.68rem', fontWeight: 400 }}>{formatRelTime(v.timestamp)}</span>
        </button>
      ))}
      {/* Next */}
      <button
        className="btn btn-ghost btn-icon"
        style={{ width: 26, height: 26, padding: 0 }}
        disabled={activeIndex >= sorted.length - 1}
        onClick={() => onVersionChange(sorted[activeIndex + 1])}
        title="Next version"
        id="next-version-btn"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {/* Delete Version */}
      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
      <button
        className="btn btn-ghost btn-icon"
        style={{ width: 26, height: 26, padding: 0, color: 'var(--text-muted)' }}
        onClick={() => {
          if (confirm(`Delete version v${activeVersionNum}?`)) {
            onDeleteVersion(run.id, activeVersionNum);
          }
        }}
        title="Delete active version"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onUploadClick }) {
  return (
    <div className="welcome-screen">
      <div>
        <div className="welcome-hero">AgentLens</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-light)', marginBottom: 'var(--space-3)' }}>
          LLM / Agent Output Viewer
        </div>
        <p className="welcome-sub">
          Upload JSON outputs from LLMs and agents. Browse structured reports, track version history, and compare runs with field-level diffs.
        </p>
      </div>
      <button className="btn btn-primary" onClick={onUploadClick} style={{ fontSize: '0.95rem', padding: '10px 24px' }}>
        ⬆️ Upload your first JSON file
      </button>
      <div className="welcome-features">
        {[
          { icon: '⬆️', title: 'Upload & Version', desc: 'Drag-drop JSON files. Auto-group into runs with version history.' },
          { icon: '🗂️', title: 'Structured View', desc: 'SWOT boards, PESTLE tabs, insight cards, strategic imperatives.' },
          { icon: '⚖️', title: 'Git-style Diff', desc: 'Unified diff with +/− lines and collapsible context blocks.' },
          { icon: '🔌', title: 'Generic Fallback', desc: 'Any unknown schema key is still rendered — nothing is ever hidden.' },
        ].map(f => (
          <div key={f.title} className="welcome-feature">
            <span className="icon">{f.icon}</span>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pipeline Flow Nav ─────────────────────────────────────────────────────────
function FlowNav({ activeStage, onStageChange, data }) {
  const available = PIPELINE_STAGES.filter(s => data && data[s.key] != null);
  return (
    <nav className="flow-nav-bar" aria-label="Pipeline stages">
      {PIPELINE_STAGES.map((stage, i) => {
        const isAvailable = available.some(s => s.key === stage.key);
        const isActive = activeStage === stage.key;
        const isLast = i === PIPELINE_STAGES.length - 1;
        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className={`flow-stage-btn ${isActive ? 'active' : ''} ${!isAvailable ? 'unavailable' : ''}`}
              onClick={() => isAvailable && onStageChange(stage.key)}
              disabled={!isAvailable}
              id={`flow-btn-${stage.key}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span>{stage.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{stage.label}</span>
            </button>
            {!isLast && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </div>
        );
      })}
      <style>{`
        .flow-stage-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: var(--radius-md);
          border: 1px solid transparent; background: transparent;
          color: var(--text-secondary); font-family: var(--font);
          cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
        }
        .flow-stage-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border); }
        .flow-stage-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 0 14px var(--primary-glow); }
        .flow-stage-btn.unavailable { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </nav>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [runs, setRuns] = useState(() => storage.listRuns());
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeVersionNum, setActiveVersionNum] = useState(null);
  const [activeStage, setActiveStage] = useState('situational_analysis');
  const [diffMode, setDiffMode] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const activeRun = runs.find(r => r.id === activeRunId) ?? null;
  const activeVersion = activeRun?.versions.find(v => v.versionNumber === activeVersionNum) ?? null;
  const data = activeVersion?.data ?? null;

  // Compute inline diff (latest 2 versions) for badge overlays
  const diffResult = useMemo(() => {
    if (!diffMode || !activeRun || activeRun.versions.length < 2) return null;
    const sorted = [...activeRun.versions].sort((a, b) => a.versionNumber - b.versionNumber);
    return diffDocuments(sorted.at(-2).data, sorted.at(-1).data);
  }, [diffMode, activeRun]);

  const { unknown: unknownKeys } = useMemo(() => classifyTopLevelKeys(data), [data]);

  function refreshRuns() {
    const fresh = storage.listRuns();
    setRuns(fresh);
    // keep active run in sync
    if (activeRunId) {
      const updated = fresh.find(r => r.id === activeRunId);
      if (!updated) { setActiveRunId(null); setActiveVersionNum(null); }
    }
  }

  function selectVersion(run, version) {
    setActiveRunId(run.id);
    setActiveVersionNum(version.versionNumber);
    setDiffMode(false);
    if (version?.data) {
      const first = ['situational_analysis', 'insight_rows', 'strategic_imperatives'].find(s => version.data[s] != null);
      if (first) setActiveStage(first);
    }
  }

  function handleUploadComplete(run) {
    refreshRuns();
    setUploadOpen(false);
    const latestV = run.versions.at(-1);
    selectVersion(run, latestV);
  }

  function handleSelectRun(run) {
    const latestV = [...run.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
    if (latestV) selectVersion(run, latestV);
  }

  function handleVersionChange(version) {
    setActiveVersionNum(version.versionNumber);
    setDiffMode(false);
  }

  function handleDeleteRun(runId) {
    storage.deleteRun(runId);
    const fresh = storage.listRuns();
    setRuns(fresh);
    if (fresh.length > 0) {
      handleSelectRun(fresh[0]);
    } else {
      setActiveRunId(null);
      setActiveVersionNum(null);
    }
  }

  function handleDeleteVersion(runId, vNum) {
    storage.deleteVersion(runId, vNum);
    const fresh = storage.listRuns();
    setRuns(fresh);
    const run = fresh.find(r => r.id === runId);
    if (run && run.versions.length > 0) {
      handleSelectRun(run);
    } else {
      if (fresh.length > 0) {
        handleSelectRun(fresh[0]);
      } else {
        setActiveRunId(null);
        setActiveVersionNum(null);
      }
    }
  }

  const stageDiff = diffResult ? getDiffChild(diffResult, activeStage) : null;

  const stageContent = () => {
    if (!data) return null;
    switch (activeStage) {
      case 'situational_analysis': return <SituationalAnalysis data={data.situational_analysis} diffNode={stageDiff} />;
      case 'insight_rows':         return <InsightRows data={data.insight_rows} diffNode={stageDiff} />;
      case 'strategic_imperatives':return <StrategicImperatives data={data.strategic_imperatives} diffNode={stageDiff} />;
      default: return null;
    }
  };

  return (
    <div className="app-layout">
      {/* ── Primary Topbar ── */}
      <header className="primary-topbar" role="banner">
        {/* Logo */}
        <div className="topbar-logo">
          <div className="topbar-logo-icon">🔬</div>
          <span>AgentLens</span>
        </div>

        <div className="topbar-divider" />

        {/* Upload */}
        <TopbarUpload onUploadComplete={handleUploadComplete} />

        {runs.length > 0 && <>
          <div className="topbar-divider" />
          {/* Run selector */}
          <RunSelector runs={runs} activeRunId={activeRunId} onSelectRun={handleSelectRun} onDeleteRun={handleDeleteRun} />

          {/* Version strip */}
          {activeRun && <>
            <div className="topbar-divider" />
            <VersionStrip
              run={activeRun}
              activeVersionNum={activeVersionNum}
              onVersionChange={handleVersionChange}
              onDeleteVersion={handleDeleteVersion}
            />
          </>}
        </>}

        {/* Right side actions */}
        <div className="topbar-right">
          {activeRun && activeRun.versions.length >= 2 && (
            <button
              className={`btn btn-sm ${diffMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDiffMode(d => !d)}
              id="toggle-diff"
              style={{ gap: 6 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M9 12h6" />
              </svg>
              {diffMode ? 'Exit Diff' : 'Diff'}
            </button>
          )}
          {activeVersion && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {activeVersion.sourceFilename}
            </div>
          )}
        </div>
      </header>

      {/* ── Pipeline Flow Nav (only when not in diff mode and data loaded) ── */}
      {data && !diffMode && (
        <FlowNav activeStage={activeStage} onStageChange={setActiveStage} data={data} />
      )}

      {/* ── Main view area ── */}
      <div className="main-view" role="main">
        {!activeVersion ? (
          <WelcomeScreen onUploadClick={() => setUploadOpen(true)} />
        ) : diffMode ? (
          <DiffView run={activeRun} />
        ) : (
          <>
            {stageContent()}

            {/* Unknown top-level keys — generic fallback */}
            {unknownKeys.length > 0 && (
              <div style={{ marginTop: 'var(--space-8)' }}>
                <div style={{ height: 1, background: 'var(--border)', margin: 'var(--space-6) 0' }} />
                <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📋 Additional Sections
                  <span className="badge badge-warning">custom schema</span>
                  {diffResult && unknownKeys.some(k => getDiffChild(diffResult, k)?.type !== 'unchanged') && (
                    <DiffBadge type="changed" />
                  )}
                </h3>
                {unknownKeys.map(key => (
                  <div key={key} className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
                      <h3 style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</h3>
                      <DiffBadge type={diffResult ? getDiffChild(diffResult, key)?.type : null} />
                    </div>
                    <GenericTree data={data[key]} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload overlay (triggered from welcome screen button) */}
      {uploadOpen && (
        <div className="upload-drop-overlay" onClick={(e) => e.target === e.currentTarget && setUploadOpen(false)}>
          <div className="upload-drop-box">
            <div style={{ fontSize: '2.5rem' }}>⬆️</div>
            <h2>Upload JSON File</h2>
            <UploadPanel onUploadComplete={handleUploadComplete} />
            <button className="btn btn-ghost btn-sm" onClick={() => setUploadOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
