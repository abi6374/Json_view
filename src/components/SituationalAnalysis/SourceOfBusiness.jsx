import { useState } from 'react';
import DiffBadge from '../DiffBadge.jsx';
import { getDiffChild } from '../../lib/diff.js';

const IMPACT_COLORS = {
  High:   { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   text: '#4ade80' },
  Medium: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24' },
  Low:    { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', text: '#94a3b8' },
};

function ImpactBadge({ level }) {
  const c = IMPACT_COLORS[level] ?? IMPACT_COLORS.Low;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: '0.72rem', fontWeight: 600 }}>
      {level}
    </span>
  );
}

function GrowthDriverCard({ driver, diffNode }) {
  const [open, setOpen] = useState(false);
  const dtype = diffNode?.type;

  return (
    <div className={`card ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`} style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '0.78rem' }}>#{driver.rank}</span>
            <h4 style={{ fontSize: '0.88rem' }}>{driver.growth_driver ?? '—'}</h4>
            {driver.impact_level && <ImpactBadge level={driver.impact_level} />}
            <DiffBadge type={dtype} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--diff-removed)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{driver.from ?? '—'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span style={{ color: 'var(--diff-added)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{driver.to ?? '—'}</span>
          </div>
          {driver.markets && (
            <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Markets: {driver.markets}</div>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(o => !o)}
          style={{ flexShrink: 0 }}
        >
          {open ? 'Less' : 'More'}
        </button>
      </div>

      {open && (
        <div className="accordion-body" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {Array.isArray(driver.why_happening) && driver.why_happening.length > 0 && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Why</div>
              <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {driver.why_happening.map((w, i) => <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{w}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(driver.expected_impact) && driver.expected_impact.length > 0 && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Expected Impact</div>
              <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {driver.expected_impact.map((e, i) => <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{e}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(driver.source_signal_ids) && driver.source_signal_ids.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {driver.source_signal_ids.map(s => <span key={s} className="signal-chip">{s}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SegmentCard({ segmentKey, segment, diffNode }) {
  const [open, setOpen] = useState(false);
  const dtype = diffNode?.type;
  const summary = segment.summary ?? {};
  const drivers = Array.isArray(segment.growth_drivers) ? segment.growth_drivers : [];
  const topSources = Array.isArray(segment.top_sources_table) ? segment.top_sources_table : [];

  return (
    <div className={`card ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`} style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
            <span className="badge badge-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{segment.cancer_type ?? segmentKey}</span>
            <DiffBadge type={dtype} />
          </div>
          {summary.headline && (
            <p style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--text-primary)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>{summary.headline}</p>
          )}
          {summary.key_insight && (
            <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{summary.key_insight}</p>
          )}
          {(summary.headline_prize_year || summary.headline_prize_patients) && (
            <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {summary.headline_prize_year && <span>Year: {summary.headline_prize_year}</span>}
              {summary.headline_prize_patients && <span>Patients: {summary.headline_prize_patients}</span>}
            </div>
          )}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(o => !o)} style={{ flexShrink: 0 }}>
          {open ? 'Collapse' : `${drivers.length} drivers`}
        </button>
      </div>

      {open && (
        <div className="accordion-body" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>Growth Drivers</h4>
          {drivers.map((d, i) => (
            <GrowthDriverCard key={d.rank ?? i} driver={d} diffNode={diffNode ? getDiffChild(getDiffChild(diffNode, 'growth_drivers'), i) : null} />
          ))}

          {topSources.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>Top Sources</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'From → To', 'Markets', 'Impact', 'Driver'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topSources.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 8px', color: 'var(--primary-light)', fontWeight: 700 }}>{row.rank}</td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-primary)' }}>{row.from_to}</td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{row.markets}</td>
                      <td style={{ padding: '8px 8px' }}><ImpactBadge level={row.impact_level} /></td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{row.growth_driver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SourceOfBusiness({ data, diffNode }) {
  if (!data || typeof data !== 'object') return null;
  const segments = Object.keys(data);

  return (
    <div>
      {segments.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📊</span>
          <h3>No source of business data</h3>
        </div>
      )}
      {segments.map(key => (
        <SegmentCard
          key={key}
          segmentKey={key}
          segment={data[key]}
          diffNode={diffNode ? getDiffChild(diffNode, key) : null}
        />
      ))}
    </div>
  );
}
