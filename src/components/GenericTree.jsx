import { useState } from 'react';

/**
 * GenericTree — recursive fallback renderer for unknown schema sections.
 * Handles: objects, arrays, primitives, null values.
 * Also used inside DiffView for rendering raw diff values.
 */

function renderValue(val, depth = 0) {
  if (val === null || val === undefined) {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>;
  }
  if (typeof val === 'boolean') {
    return <span style={{ color: val ? 'var(--diff-added)' : 'var(--diff-removed)' }}>{val ? 'true' : 'false'}</span>;
  }
  if (typeof val === 'number') {
    return <span style={{ color: '#60a5fa' }}>{val}</span>;
  }
  if (typeof val === 'string') {
    if (val === '') return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>''</span>;
    return <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{val}</span>;
  }
  if (Array.isArray(val)) {
    return <ArrayNode items={val} depth={depth} />;
  }
  if (typeof val === 'object') {
    return <ObjectNode obj={val} depth={depth} />;
  }
  return <span>{String(val)}</span>;
}

function ObjectNode({ obj, depth }) {
  const [open, setOpen] = useState(depth < 2);
  const keys = Object.keys(obj);
  if (keys.length === 0) return <span style={{ color: 'var(--text-muted)' }}>&#123;&#125;</span>;

  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <button
        className="accordion-header"
        onClick={() => setOpen(o => !o)}
        style={{ padding: '2px 6px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', marginBottom: 2 }}
      >
        <span style={{ color: 'var(--text-muted)' }}>&#123;{keys.length} fields&#125;</span>
        <svg className={`accordion-icon ${open ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ paddingLeft: 12, borderLeft: '1px solid var(--border-subtle)' }}>
          {keys.map(k => (
            <div key={k} style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{
                color: 'var(--primary-light)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
                flexShrink: 0,
                paddingTop: 2,
              }}>{k}:</span>
              <div style={{ flex: 1, minWidth: 0 }}>{renderValue(obj[k], depth + 1)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArrayNode({ items, depth }) {
  const [open, setOpen] = useState(depth < 1);
  if (items.length === 0) return <span style={{ color: 'var(--text-muted)' }}>[]</span>;

  return (
    <div>
      <button
        className="accordion-header"
        onClick={() => setOpen(o => !o)}
        style={{ padding: '2px 6px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', marginBottom: 2 }}
      >
        <span style={{ color: 'var(--text-muted)' }}>[{items.length} items]</span>
        <svg className={`accordion-icon ${open ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ paddingLeft: 12, borderLeft: '1px solid var(--border-subtle)' }}>
          {items.map((item, i) => (
            <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', flexShrink: 0, paddingTop: 2 }}>{i}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>{renderValue(item, depth + 1)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GenericTree({ data, label }) {
  return (
    <div style={{ fontSize: '0.85rem' }}>
      {label && (
        <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
      )}
      {renderValue(data, 0)}
    </div>
  );
}

export { renderValue };
