import { useState } from 'react';
import DiffBadge from '../DiffBadge.jsx';
import { getDiffChild } from '../../lib/diff.js';

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const cls = confidence === 'high' ? 'badge-high' : confidence === 'medium' ? 'badge-medium' : 'badge-low';
  return <span className={`badge ${cls}`}>{confidence}</span>;
}

function SwotItem({ item, diffNode }) {
  const [open, setOpen] = useState(false);
  const dtype = diffNode?.type;

  return (
    <div className={`swot-item ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`}
         style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.6, cursor: item.rationale ? 'pointer' : 'default' }}
          onClick={() => item.rationale && setOpen(o => !o)}
        >
          {item.claim ?? '—'}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {item.confidence && <ConfidenceBadge confidence={item.confidence} />}
          {item.signal_id && <span className="signal-chip">{item.signal_id}</span>}
          <DiffBadge type={dtype} />
        </div>
      </div>
      {open && item.rationale && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          animation: 'slideDown var(--transition-base) ease',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Rationale</div>
          {item.rationale}
        </div>
      )}
    </div>
  );
}

function QuadrantCard({ title, items, color, borderColor, icon, diffNode }) {
  const dtype = diffNode?.type;
  return (
    <div style={{
      background: color,
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{title}</h3>
        <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{items.length}</span>
        <DiffBadge type={dtype} />
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No items</div>
      ) : (
        items.map((item, i) => {
          const itemDiff = diffNode ? getDiffChild(diffNode, i) : null;
          return <SwotItem key={item.signal_id ?? i} item={item} diffNode={itemDiff} />;
        })
      )}
    </div>
  );
}

const QUADRANT_CONFIG = {
  strengths:     { color: 'var(--swot-strengths)',     border: 'var(--swot-strengths-border)',     icon: '💪' },
  weaknesses:    { color: 'var(--swot-weaknesses)',    border: 'var(--swot-weaknesses-border)',    icon: '⚠️' },
  opportunities: { color: 'var(--swot-opportunities)', border: 'var(--swot-opportunities-border)', icon: '🚀' },
  threats:       { color: 'var(--swot-threats)',       border: 'var(--swot-threats-border)',       icon: '🛡️' },
};

export default function Swot({ data, diffNode }) {
  if (!data) return null;

  const quadrants = ['strengths', 'weaknesses', 'opportunities', 'threats'];

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--space-4)',
      }}>
        {quadrants.map(q => {
          const items = Array.isArray(data[q]) ? data[q] : [];
          const cfg = QUADRANT_CONFIG[q] ?? { color: 'var(--bg-panel)', border: 'var(--border)', icon: '•' };
          const qDiff = diffNode ? getDiffChild(diffNode, q) : null;
          return (
            <QuadrantCard
              key={q}
              title={q}
              items={items}
              color={cfg.color}
              borderColor={cfg.border}
              icon={cfg.icon}
              diffNode={qDiff}
            />
          );
        })}
      </div>
      {/* Fallback for unknown quadrant keys */}
      {Object.keys(data).filter(k => !quadrants.includes(k)).map(k => (
        <div key={k} style={{ marginTop: 'var(--space-4)' }}>
          <h4 style={{ textTransform: 'capitalize', marginBottom: 8 }}>{k}</h4>
          {(data[k] ?? []).map((item, i) => (
            <SwotItem key={i} item={item} diffNode={null} />
          ))}
        </div>
      ))}

      <style>{`
        @media (max-width: 640px) {
          .swot-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
