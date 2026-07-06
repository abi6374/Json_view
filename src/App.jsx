import { useState, useMemo, useEffect } from 'react';
import './App.css';
import { storage } from './lib/storage.js';
import { diffDocuments, getDiffChild } from './lib/diff.js';
import { classifyTopLevelKeys } from './lib/schema.js';
import RunSidebar from './components/RunSidebar.jsx';
import FlowNav from './components/FlowNav.jsx';
import SituationalAnalysis from './components/SituationalAnalysis/index.jsx';
import InsightRows from './components/InsightRows.jsx';
import StrategicImperatives from './components/StrategicImperatives.jsx';
import DiffView from './components/DiffView.jsx';
import GenericTree from './components/GenericTree.jsx';
import DiffBadge from './components/DiffBadge.jsx';

function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <div>
        <div className="welcome-hero">AgentLens</div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-light)', marginBottom: 'var(--space-3)' }}>
          LLM / Agent Output Viewer
        </div>
        <p className="welcome-sub">
          Upload JSON outputs from LLMs and agents. Browse structured reports, track version history, and compare runs with field-level diffs.
        </p>
      </div>
      <div className="welcome-features">
        {[
          { icon: '⬆️', title: 'Upload & Version', desc: 'Drag-drop JSON files. Auto-group into runs with version history.' },
          { icon: '🗂️', title: 'Structured View', desc: 'SWOT boards, PESTLE tabs, insight cards, strategic imperatives.' },
          { icon: '⚖️', title: 'Diff Engine', desc: 'Field-level diffs with stable ID matching. See exactly what changed.' },
          { icon: '🔌', title: 'Generic Fallback', desc: 'Any unknown schema key is still rendered — nothing is ever hidden.' },
        ].map(f => (
          <div key={f.title} className="welcome-feature">
            <span className="icon">{f.icon}</span>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        ← Upload a JSON file using the sidebar to get started
      </div>
    </div>
  );
}

function VersionNav({ run, activeVersion, onVersionChange }) {
  if (!run || run.versions.length < 2) return null;
  const sorted = [...run.versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const currentIndex = sorted.findIndex(v => v.versionNumber === activeVersion?.versionNumber);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <button
        className="btn btn-ghost btn-icon btn-sm"
        disabled={currentIndex <= 0}
        onClick={() => onVersionChange(sorted[currentIndex - 1])}
        title="Previous version"
        id="prev-version"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        v{activeVersion?.versionNumber} / {run.versions.length}
      </span>
      <button
        className="btn btn-ghost btn-icon btn-sm"
        disabled={currentIndex >= sorted.length - 1}
        onClick={() => onVersionChange(sorted[currentIndex + 1])}
        title="Next version"
        id="next-version"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  const [activeRun, setActiveRun] = useState(null);
  const [activeVersion, setActiveVersion] = useState(null);
  const [activeStage, setActiveStage] = useState('situational_analysis');
  const [diffMode, setDiffMode] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  const data = activeVersion?.data ?? null;

  // Compute top-level diff between latest 2 versions when in diff mode
  const diffResult = useMemo(() => {
    if (!diffMode || !activeRun || activeRun.versions.length < 2) return null;
    const sorted = [...activeRun.versions].sort((a, b) => a.versionNumber - b.versionNumber);
    const older = sorted[sorted.length - 2];
    const newer = sorted[sorted.length - 1];
    return diffDocuments(older.data, newer.data);
  }, [diffMode, activeRun]);

  // Classify unknown top-level keys
  const { unknown: unknownKeys } = useMemo(
    () => classifyTopLevelKeys(data),
    [data]
  );

  function handleSelectVersion(run, version) {
    setActiveRun(run);
    setActiveVersion(version);
    // Auto-navigate to first available stage
    if (version?.data) {
      const stages = ['situational_analysis', 'insight_rows', 'strategic_imperatives'];
      const first = stages.find(s => version.data[s] != null);
      if (first) setActiveStage(first);
    }
  }

  function handleVersionChange(version) {
    setActiveVersion(version);
  }

  const stageContent = () => {
    if (!data) return null;

    const stageDiff = diffResult ? getDiffChild(diffResult, activeStage) : null;

    switch (activeStage) {
      case 'situational_analysis':
        return <SituationalAnalysis data={data.situational_analysis} diffNode={stageDiff} />;
      case 'insight_rows':
        return <InsightRows data={data.insight_rows} diffNode={stageDiff} />;
      case 'strategic_imperatives':
        return <StrategicImperatives data={data.strategic_imperatives} diffNode={stageDiff} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar" aria-label="Run sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🔬</div>
            <span>AgentLens</span>
          </div>
        </div>
        <div className="sidebar-body">
          <RunSidebar
            key={sidebarRefresh}
            activeRunId={activeRun?.id}
            activeVersionNum={activeVersion?.versionNumber}
            onSelectVersion={handleSelectVersion}
            onRefresh={() => {
              setSidebarRefresh(r => r + 1);
              // Re-load active run from storage
              if (activeRun) {
                const updated = storage.getRun(activeRun.id);
                if (updated) {
                  setActiveRun(updated);
                  if (activeVersion) {
                    const updatedV = updated.versions.find(v => v.versionNumber === activeVersion.versionNumber);
                    setActiveVersion(updatedV ?? updated.versions.at(-1) ?? null);
                  }
                } else {
                  setActiveRun(null);
                  setActiveVersion(null);
                }
              }
            }}
          />
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {activeRun ? (
              <>
                <div>
                  <div className="run-title">{activeRun.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {activeVersion?.sourceFilename} · v{activeVersion?.versionNumber}
                    {activeVersion?.timestamp && (
                      <> · {new Date(activeVersion.timestamp).toLocaleString()}</>
                    )}
                  </div>
                </div>
                <VersionNav
                  run={activeRun}
                  activeVersion={activeVersion}
                  onVersionChange={handleVersionChange}
                />
              </>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No run selected</div>
            )}
          </div>
          <div className="topbar-right">
            {activeRun && activeRun.versions.length >= 2 && (
              <button
                className={`btn ${diffMode ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setDiffMode(d => !d)}
                id="toggle-diff"
              >
                ⚖️ {diffMode ? 'Exit Diff' : 'Diff View'}
              </button>
            )}
          </div>
        </header>

        {/* Flow Navigation */}
        {data && !diffMode && (
          <FlowNav activeStage={activeStage} onStageChange={setActiveStage} data={data} />
        )}

        {/* View area */}
        <div className="view-area">
          {!activeVersion ? (
            <WelcomeScreen />
          ) : diffMode ? (
            <DiffView run={activeRun} />
          ) : (
            <>
              {stageContent()}

              {/* Unknown top-level keys — generic fallback */}
              {unknownKeys.length > 0 && (
                <div style={{ marginTop: 'var(--space-8)' }}>
                  <div className="divider" />
                  <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📋 Additional Sections
                    <span className="badge badge-warning">custom schema</span>
                    {diffResult && (
                      <DiffBadge type={unknownKeys.some(k => getDiffChild(diffResult, k)?.type !== 'unchanged') ? 'changed' : null} />
                    )}
                  </h3>
                  {unknownKeys.map(key => (
                    <div key={key} className="card" style={{ marginBottom: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
                        <h3 style={{ textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </h3>
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
      </main>
    </div>
  );
}
