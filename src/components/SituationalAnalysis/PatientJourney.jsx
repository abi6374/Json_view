import { useState } from 'react';
import DiffBadge from '../DiffBadge.jsx';
import { getDiffChild } from '../../lib/diff.js';

function LeakagePct({ value }) {
  if (!value || value === 'GC: null, GEJC: null') return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {String(value).split(',').map((part, i) => {
        const [label, pct] = part.split(':').map(s => s.trim());
        if (!pct || pct === 'null') return null;
        return (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '0.72rem', fontWeight: 600, color: '#f87171',
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{label}</span> {pct} leakage
          </span>
        );
      })}
    </div>
  );
}

function StageCard({ stage, index, isActive, onClick, diffNode }) {
  const dtype = diffNode?.type;
  return (
    <div
      className={`stage-card ${isActive ? 'active' : ''} ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="stage-number">{stage.stage_number ?? index + 1}</div>
      <div className="stage-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h4 style={{ fontSize: '0.88rem' }}>{stage.stage_name ?? '—'}</h4>
          <DiffBadge type={dtype} />
        </div>
        <LeakagePct value={stage.leakage_pct} />
      </div>
    </div>
  );
}

function StageDetail({ stage }) {
  if (!stage) return null;

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <h3 style={{ marginBottom: 'var(--space-3)' }}>Stage {stage.stage_number}: {stage.stage_name}</h3>
      <LeakagePct value={stage.leakage_pct} />

      <div className="divider" />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>What Happens</div>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{stage.what_happens ?? '—'}</p>
      </div>

      {stage.mdt_involvement && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>MDT Involvement</div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{stage.mdt_involvement}</p>
        </div>
      )}

      {Array.isArray(stage.source_signal_ids) && stage.source_signal_ids.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Signals</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {stage.source_signal_ids.map(s => <span key={s} className="signal-chip">{s}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientJourney({ data, diffNode }) {
  const [activeStage, setActiveStage] = useState(0);
  if (!data) return null;

  const stages = Array.isArray(data.stages) ? data.stages : [];
  const leakagePoints = Array.isArray(data.priority_leakage_points) ? data.priority_leakage_points : [];

  return (
    <div>
      {/* Stage timeline */}
      <div className="journey-timeline">
        {stages.map((stage, i) => {
          const stagesDiff = diffNode ? getDiffChild(diffNode, 'stages') : null;
          const itemDiff = stagesDiff ? getDiffChild(stagesDiff, i) : null;
          return (
            <div key={stage.stage_number ?? i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <StageCard
                stage={stage}
                index={i}
                isActive={activeStage === i}
                onClick={() => setActiveStage(i)}
                diffNode={itemDiff}
              />
              {i < stages.length - 1 && (
                <div className="journey-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      <StageDetail stage={stages[activeStage]} />

      {/* Priority leakage points */}
      {leakagePoints.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)' }}>⚡ Priority Leakage Points</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {leakagePoints.map((lp, i) => (
              <div key={i} className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
                  <h4 style={{ fontSize: '0.88rem' }}>{lp.name ?? '—'}</h4>
                  {lp.stage && <span className="badge badge-neutral">{lp.stage}</span>}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{lp.what_happening_today ?? '—'}</p>
                {Array.isArray(lp.source_signal_ids) && lp.source_signal_ids.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {lp.source_signal_ids.map(s => <span key={s} className="signal-chip">{s}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .journey-timeline {
          display: flex;
          align-items: center;
          overflow-x: auto;
          padding-bottom: var(--space-2);
          gap: 0;
        }
        .stage-card {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-panel);
          min-width: 100px;
          max-width: 130px;
          transition: all var(--transition-fast);
        }
        .stage-card:hover { border-color: var(--primary); background: var(--primary-dim); }
        .stage-card.active { border-color: var(--primary); background: var(--primary-dim); box-shadow: 0 0 12px var(--primary-glow); }
        .stage-number {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--bg-elevated);
          border: 2px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700;
          flex-shrink: 0;
        }
        .stage-card.active .stage-number { background: var(--primary); border-color: var(--primary); color: white; }
        .stage-content { text-align: center; }
        .journey-arrow {
          color: var(--text-muted);
          padding: 0 4px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
