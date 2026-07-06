import { useState } from 'react';
import DiffBadge from '../DiffBadge.jsx';
import { getDiffChild } from '../../lib/diff.js';

function CompetitorCard({ competitor, type, diffNode }) {
  const [open, setOpen] = useState(false);
  const dtype = diffNode?.type;

  return (
    <div className={`card ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`} style={{ marginBottom: 'var(--space-3)' }}>
      <div
        className="accordion-header"
        style={{ padding: 0, marginBottom: open ? 'var(--space-3)' : 0 }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{competitor.name ?? '—'}</h4>
            <span className={`badge ${type === 'pipeline' ? 'badge-warning' : 'badge-primary'}`}>
              {type === 'pipeline' ? '🔬 Pipeline' : '✅ In-Market'}
            </span>
            <DiffBadge type={dtype} />
          </div>
          {competitor.approval_date && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved: {competitor.approval_date}</div>
          )}
          {competitor.anticipated_approval_date && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected: {competitor.anticipated_approval_date}</div>
          )}
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6 }}>{competitor.role ?? '—'}</p>
        </div>
        <svg className={`accordion-icon ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div className="accordion-body">
          <div className="divider" style={{ margin: '0 0 var(--space-3)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {competitor.strengths && (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--diff-added)', marginBottom: 6 }}>Strengths</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{competitor.strengths}</p>
              </div>
            )}
            {competitor.limitations && (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--diff-removed)', marginBottom: 6 }}>Limitations</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{competitor.limitations}</p>
              </div>
            )}
          </div>
          {competitor.approved_indication && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Approved Indication</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{competitor.approved_indication}</p>
            </div>
          )}
          {Array.isArray(competitor.source_signal_ids) && competitor.source_signal_ids.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {competitor.source_signal_ids.map(s => <span key={s} className="signal-chip">{s}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetitorAnalysis({ data, diffNode }) {
  if (!data) return null;

  const takeaways = Array.isArray(data.key_takeaways) ? data.key_takeaways : [];
  const pipeline = Array.isArray(data.pipeline_competitors) ? data.pipeline_competitors : [];
  const inMarket = Array.isArray(data.in_market_competitors) ? data.in_market_competitors : [];

  return (
    <div>
      {/* Key takeaways */}
      {takeaways.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-5)', background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            💡 Key Takeaways
            <DiffBadge type={diffNode ? getDiffChild(diffNode, 'key_takeaways')?.type : null} />
          </h3>
          <ul style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {takeaways.map((t, i) => (
              <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* In-market competitors */}
      {inMarket.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            ✅ In-Market
            <span className="badge badge-neutral">{inMarket.length}</span>
            <DiffBadge type={diffNode ? getDiffChild(diffNode, 'in_market_competitors')?.type : null} />
          </h3>
          {inMarket.map((c, i) => (
            <CompetitorCard
              key={c.name ?? i}
              competitor={c}
              type="in-market"
              diffNode={diffNode ? getDiffChild(getDiffChild(diffNode, 'in_market_competitors'), i) : null}
            />
          ))}
        </div>
      )}

      {/* Pipeline competitors */}
      {pipeline.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔬 Pipeline
            <span className="badge badge-neutral">{pipeline.length}</span>
            <DiffBadge type={diffNode ? getDiffChild(diffNode, 'pipeline_competitors')?.type : null} />
          </h3>
          {pipeline.map((c, i) => (
            <CompetitorCard
              key={c.name ?? i}
              competitor={c}
              type="pipeline"
              diffNode={diffNode ? getDiffChild(getDiffChild(diffNode, 'pipeline_competitors'), i) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
