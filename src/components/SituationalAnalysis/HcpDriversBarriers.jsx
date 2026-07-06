import { useState } from 'react';
import DiffBadge from '../DiffBadge.jsx';
import { getDiffChild } from '../../lib/diff.js';

const HCP_ICONS = {
  surgeons: '🔪',
  medical_oncologists: '💊',
  gastroenterologists: '🩺',
  radiation_oncologists: '☢️',
};

function DriversBarriersPanel({ drivers, barriers, signals, diffNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
      {/* Drivers */}
      <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
          <h4 style={{ color: 'var(--diff-added)', fontSize: '0.88rem' }}>✅ Drivers</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({(drivers ?? []).length})</span>
          <DiffBadge type={diffNode ? getDiffChild(diffNode, 'drivers')?.type : null} />
        </div>
        {(drivers ?? []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>None listed</div>
        ) : (
          <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(drivers ?? []).map((d, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{d}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Barriers */}
      <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
          <h4 style={{ color: 'var(--diff-removed)', fontSize: '0.88rem' }}>⚠️ Barriers</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({(barriers ?? []).length})</span>
          <DiffBadge type={diffNode ? getDiffChild(diffNode, 'barriers')?.type : null} />
        </div>
        {(barriers ?? []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>None listed</div>
        ) : (
          <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(barriers ?? []).map((b, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{b}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Signals footer */}
      {Array.isArray(signals) && signals.length > 0 && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {signals.slice(0, 10).map(s => <span key={s} className="signal-chip">{s}</span>)}
          {signals.length > 10 && <span className="badge badge-neutral">+{signals.length - 10}</span>}
        </div>
      )}
    </div>
  );
}

export default function HcpDriversBarriers({ data, diffNode }) {
  if (!data || typeof data !== 'object') return null;

  const hcpTypes = Object.keys(data);
  const [activeHcp, setActiveHcp] = useState(hcpTypes[0] ?? '');

  return (
    <div>
      {/* HCP type tabs */}
      <div className="tab-bar" style={{ marginBottom: 'var(--space-4)' }}>
        {hcpTypes.map(hcp => (
          <button
            key={hcp}
            className={`tab-btn ${activeHcp === hcp ? 'active' : ''}`}
            onClick={() => setActiveHcp(hcp)}
            id={`hcp-tab-${hcp}`}
          >
            {HCP_ICONS[hcp] ?? '👩‍⚕️'} {hcp.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {activeHcp && data[activeHcp] && (
        <DriversBarriersPanel
          drivers={data[activeHcp].drivers}
          barriers={data[activeHcp].barriers}
          signals={data[activeHcp].source_signal_ids}
          diffNode={diffNode ? getDiffChild(diffNode, activeHcp) : null}
        />
      )}
    </div>
  );
}
