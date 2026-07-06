import { useState } from 'react';
import DiffBadge from '../DiffBadge.jsx';
import { getDiffChild } from '../../lib/diff.js';

const CATEGORY_ICONS = {
  political: '🏛️', economic: '💰', social: '👥',
  technological: '⚙️', legal: '⚖️', environmental: '🌿',
};
const CATEGORY_COLORS = {
  political:     'rgba(99,102,241,0.08)',
  economic:      'rgba(34,197,94,0.08)',
  social:        'rgba(59,130,246,0.08)',
  technological: 'rgba(168,85,247,0.08)',
  legal:         'rgba(239,68,68,0.08)',
  environmental: 'rgba(20,184,166,0.08)',
};

function PestleItem({ item, diffNode }) {
  const [open, setOpen] = useState(false);
  const dtype = diffNode?.type;

  return (
    <div className={`pestle-item ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`}
         style={{ borderRadius: 'var(--radius-md)', marginBottom: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <div
        className="accordion-header"
        onClick={() => (item.observation || item.rationale) && setOpen(o => !o)}
        style={{ cursor: (item.observation || item.rationale) ? 'pointer' : 'default' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
            {item.headline ?? '—'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {item.confidence && (
              <span className={`badge ${item.confidence === 'high' ? 'badge-high' : item.confidence === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                {item.confidence}
              </span>
            )}
            {Array.isArray(item.source_signal_ids) && item.source_signal_ids.slice(0, 2).map(s => (
              <span key={s} className="signal-chip">{s}</span>
            ))}
            {Array.isArray(item.source_signal_ids) && item.source_signal_ids.length > 2 && (
              <span className="badge badge-neutral">+{item.source_signal_ids.length - 2}</span>
            )}
            <DiffBadge type={dtype} />
          </div>
        </div>
        {(item.observation || item.rationale) && (
          <svg className={`accordion-icon ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>
      {open && (
        <div className="accordion-body" style={{ padding: '0 var(--space-4) var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          {item.observation && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Observation</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{item.observation}</p>
            </div>
          )}
          {item.rationale && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Rationale</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{item.rationale}</p>
            </div>
          )}
          {Array.isArray(item.source_signal_ids) && item.source_signal_ids.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {item.source_signal_ids.map(s => <span key={s} className="signal-chip">{s}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, items, diffNode }) {
  const [open, setOpen] = useState(true);
  const icon = CATEGORY_ICONS[category] ?? '📋';
  const color = CATEGORY_COLORS[category] ?? 'transparent';
  const dtype = diffNode?.type;

  return (
    <div style={{ background: color, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
      <div className="accordion-header" style={{ padding: 'var(--space-3) var(--space-4)' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ flex: 1, textTransform: 'capitalize', fontSize: '0.95rem' }}>{category}</h3>
        <span className="badge badge-neutral">{items.length}</span>
        <DiffBadge type={dtype} />
        <svg className={`accordion-icon ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {open && (
        <div className="accordion-body" style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          {items.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>No entries in this category</div>
          ) : (
            items.map((item, i) => {
              const itemDiff = diffNode ? getDiffChild(diffNode, i) : null;
              return <PestleItem key={item.source_signal_ids?.[0] ?? i} item={item} diffNode={itemDiff} />;
            })
          )}
        </div>
      )}
    </div>
  );
}

const KNOWN_CATEGORIES = ['political', 'economic', 'social', 'technological', 'legal', 'environmental'];

export default function Pestle({ data, diffNode }) {
  if (!data) return null;

  const categories = KNOWN_CATEGORIES.filter(c => Array.isArray(data[c]) && data[c].length > 0);
  const unknownCategories = Object.keys(data).filter(k => !KNOWN_CATEGORIES.includes(k));

  const [activeTab, setActiveTab] = useState(categories[0] ?? '');

  return (
    <div>
      {/* Category tab bar */}
      <div className="tab-bar" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button
            key={c}
            className={`tab-btn ${activeTab === c ? 'active' : ''}`}
            onClick={() => setActiveTab(c)}
            id={`pestle-tab-${c}`}
          >
            {CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
            {' '}<span style={{ opacity: 0.7 }}>({data[c].length})</span>
          </button>
        ))}
        {unknownCategories.map(c => (
          <button key={c} className={`tab-btn ${activeTab === c ? 'active' : ''}`} onClick={() => setActiveTab(c)}>
            📋 {c}
          </button>
        ))}
      </div>

      {/* Active category */}
      {activeTab && (
        <CategorySection
          category={activeTab}
          items={Array.isArray(data[activeTab]) ? data[activeTab] : []}
          diffNode={diffNode ? getDiffChild(diffNode, activeTab) : null}
        />
      )}
    </div>
  );
}
