import { useState } from 'react';
import DiffBadge from './DiffBadge.jsx';
import { getDiffChild } from '../lib/diff.js';

const TOWS_CONFIG = {
  SO: { label: 'SO — Strength + Opportunity', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', desc: 'Use strengths to exploit opportunities' },
  ST: { label: 'ST — Strength + Threat',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  desc: 'Use strengths to mitigate threats' },
  WO: { label: 'WO — Weakness + Opportunity', color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   desc: 'Improve weaknesses by seizing opportunities' },
  WT: { label: 'WT — Weakness + Threat',      color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   desc: 'Minimize weaknesses and avoid threats' },
};

function CsfCard({ csf, diffNode }) {
  const dtype = diffNode?.type;
  return (
    <div className={`card-elevated ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="badge badge-neutral">{csf.type ?? '—'}</span>
        <DiffBadge type={dtype} />
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{csf.headline ?? '—'}</div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{csf.description ?? '—'}</p>
    </div>
  );
}

function ImperativeCard({ imperative, diffNode, onInsightClick, onSignalClick }) {
  const [open, setOpen] = useState(false);
  const dtype = diffNode?.type;
  const cfg = TOWS_CONFIG[imperative.tows_quadrant] ?? { color: 'var(--primary)', bg: 'var(--primary-dim)' };

  return (
    <div className={`card ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`}
         style={{ marginBottom: 'var(--space-4)', borderLeft: `3px solid ${cfg.color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{
          padding: '4px 8px', borderRadius: 'var(--radius-sm)',
          background: cfg.bg, border: `1px solid ${cfg.color}44`,
          fontSize: '0.7rem', fontWeight: 800, color: cfg.color, flexShrink: 0,
          letterSpacing: '0.05em',
        }}>
          {imperative.tows_quadrant ?? '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <h3 style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{imperative.statement ?? imperative.theme ?? '—'}</h3>
            <DiffBadge type={dtype} />
          </div>
          {imperative.theme && imperative.theme !== imperative.statement && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{imperative.theme}</div>
          )}
          {imperative.imperative_type && (
            <span className="badge badge-neutral" style={{ marginTop: 4 }}>{imperative.imperative_type}</span>
          )}
        </div>
      </div>

      {/* Sub-bullets */}
      {Array.isArray(imperative.sub_bullets) && imperative.sub_bullets.length > 0 && (
        <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-3)' }}>
          {imperative.sub_bullets.map((b, i) => (
            <li key={i} style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{b}</li>
          ))}
        </ul>
      )}

      {/* Linked references */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
        {Array.isArray(imperative.linked_insight_ranks) && imperative.linked_insight_ranks.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Insights:</span>
            {imperative.linked_insight_ranks.map(r => (
              <button
                key={r}
                className="badge badge-primary"
                onClick={() => onInsightClick?.(r)}
                style={{ cursor: 'pointer' }}
                title={`Jump to Insight #${r}`}
              >
                #{r}
              </button>
            ))}
          </div>
        )}
        {Array.isArray(imperative.linked_signal_ids) && imperative.linked_signal_ids.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Signals:</span>
            {imperative.linked_signal_ids.map(s => (
              <button
                key={s}
                className="signal-chip"
                onClick={() => onSignalClick?.(s)}
                style={{ cursor: 'pointer' }}
                title={`Signal: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Traceability + CSFs */}
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} style={{ marginBottom: open ? 'var(--space-3)' : 0 }}>
        {open ? 'Hide details' : `Details · ${(imperative.critical_success_factors ?? []).length} CSFs`}
        <svg className={`accordion-icon ${open ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="accordion-body">
          {imperative.traceability && (
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Traceability</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{imperative.traceability}</p>
            </div>
          )}
          {Array.isArray(imperative.critical_success_factors) && imperative.critical_success_factors.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                Critical Success Factors
              </div>
              {imperative.critical_success_factors.map((csf, i) => (
                <CsfCard key={i} csf={csf} diffNode={diffNode ? getDiffChild(getDiffChild(diffNode, 'critical_success_factors'), i) : null} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TowsOverview({ data }) {
  const grouped = {};
  data.forEach(imp => {
    const q = imp.tows_quadrant ?? 'Other';
    if (!grouped[q]) grouped[q] = 0;
    grouped[q]++;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
      {Object.entries(TOWS_CONFIG).map(([q, cfg]) => (
        <div key={q} style={{ padding: 'var(--space-3) var(--space-4)', background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: cfg.color }}>{q}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cfg.desc}</div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color }}>{grouped[q] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

export default function StrategicImperatives({ data, diffNode, onInsightClick, onSignalClick }) {
  const [filterQuadrant, setFilterQuadrant] = useState('');

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🎯</span>
        <h3>No strategic imperatives</h3>
        <p>This section was not found in the uploaded JSON.</p>
      </div>
    );
  }

  const quadrants = [...new Set(data.map(i => i.tows_quadrant).filter(Boolean))];
  const filtered = filterQuadrant ? data.filter(i => i.tows_quadrant === filterQuadrant) : data;

  return (
    <div>
      <TowsOverview data={data} />

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-5)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter:</span>
        <div className="tab-bar">
          <button className={`tab-btn ${!filterQuadrant ? 'active' : ''}`} onClick={() => setFilterQuadrant('')} id="tows-all">All</button>
          {quadrants.map(q => {
            const cfg = TOWS_CONFIG[q] ?? {};
            return (
              <button
                key={q}
                className={`tab-btn ${filterQuadrant === q ? 'active' : ''}`}
                onClick={() => setFilterQuadrant(q)}
                id={`tows-${q}`}
                style={filterQuadrant === q ? { background: cfg.color } : {}}
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      {/* Imperatives */}
      {filtered.map((imp, i) => {
        const itemDiff = diffNode ? diffNode.children?.find(c => {
          const k = String(c.key);
          return k.includes(imp.theme ?? '') || k.includes(imp.statement?.slice(0, 30) ?? '');
        }) : null;
        return (
          <ImperativeCard
            key={imp.theme ?? i}
            imperative={imp}
            diffNode={itemDiff}
            onInsightClick={onInsightClick}
            onSignalClick={onSignalClick}
          />
        );
      })}
    </div>
  );
}
