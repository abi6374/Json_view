import { useState, useMemo } from 'react';
import { diffDocuments, countDiffStats } from '../lib/diff.js';

// Formatter for values
function fmt(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

// ── Tree Node Component ────────────────────────────────────────────────────────

function DiffTreeNode({ node, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(node.type === 'unchanged');
  const isLeaf = !node.children || node.children.length === 0;

  // Compute local stats for non-leaves
  const stats = useMemo(() => {
    if (isLeaf) return null;
    let chg = 0, same = 0, add = 0, rem = 0;
    const walk = (n) => {
      if (n.type === 'unchanged') same++;
      else if (n.type === 'added') add++;
      else if (n.type === 'removed') rem++;
      else if (n.type === 'changed') chg++;
      (n.children || []).forEach(walk);
    };
    (node.children || []).forEach(walk);
    return { chg, same, add, rem };
  }, [node, isLeaf]);

  const indentStyle = {
    marginLeft: depth > 0 ? 24 : 0,
    borderLeft: depth > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
    paddingLeft: depth > 0 ? 16 : 0,
    paddingTop: 8,
    paddingBottom: 8,
  };

  // Node Header
  let dotColor = '#94a3b8'; // unchanged
  if (node.type === 'added') dotColor = '#22c55e';
  else if (node.type === 'removed') dotColor = '#ef4444';
  else if (node.type === 'changed') dotColor = '#f59e0b';

  const header = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
      {!isLeaf && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0,
            transform: collapsed ? 'rotate(-90deg)' : 'none', transition: '150ms', marginTop: 2
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      )}
      {isLeaf && <div style={{ width: 12 }} />} {/* alignment spacer */}

      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, marginTop: 7, flexShrink: 0 }} />
      
      <span style={{ color: '#818cf8', fontWeight: 600 }}>{String(node.key)}</span>

      {/* Type badge for root or changed nodes */}
      {node.type !== 'unchanged' && (
        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: `${dotColor}22`, color: dotColor, fontWeight: 700, marginLeft: 8, marginTop: 1 }}>
          ~ {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
        </span>
      )}

      {/* Stats for non-leaves */}
      {!isLeaf && stats && (
        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 8, marginTop: 1 }}>
          ({stats.chg + stats.add + stats.rem} changes, {stats.same} same)
        </span>
      )}
    </div>
  );

  // Body (Leaf differences or Children)
  let body = null;

  if (!collapsed) {
    if (!isLeaf) {
      body = (
        <div style={{ marginTop: 4 }}>
          {node.children.map((child, i) => (
            <DiffTreeNode key={`${child.key}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      );
    } else {
      // Leaf values (Strict 50/50 half-and-half split)
      const renderBefore = (val, label) => (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px', borderRadius: 6, color: '#fca5a5', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {fmt(val)}
          </div>
        </div>
      );

      const renderAfter = (val, label) => (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '10px 14px', borderRadius: 6, color: '#bbf7d0', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {fmt(val)}
          </div>
        </div>
      );

      const renderEmptyHalf = () => (
        <div style={{ flex: 1, minWidth: 0, opacity: 0.3 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>&nbsp;</div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', padding: '10px 14px', borderRadius: 6, color: 'transparent', fontSize: '0.85rem', lineHeight: '1.6' }}>
            —
          </div>
        </div>
      );

      if (node.type === 'changed') {
        body = (
          <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingLeft: 26 }}>
            {renderBefore(node.oldValue, 'Before (vA)')}
            <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', paddingTop: 20 }}>→</div>
            {renderAfter(node.newValue, 'After (vB)')}
          </div>
        );
      } else if (node.type === 'added') {
        body = (
          <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingLeft: 26 }}>
            {renderEmptyHalf()}
            <div style={{ display: 'flex', alignItems: 'center', color: 'transparent', paddingTop: 20 }}>→</div>
            {renderAfter(node.newValue, 'Added in After (vB)')}
          </div>
        );
      } else if (node.type === 'removed') {
        body = (
          <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingLeft: 26 }}>
            {renderBefore(node.oldValue, 'Removed in Before (vA)')}
            <div style={{ display: 'flex', alignItems: 'center', color: 'transparent', paddingTop: 20 }}>→</div>
            {renderEmptyHalf()}
          </div>
        );
      } else {
        // unchanged leaf
        body = (
          <div style={{ marginTop: 4, paddingLeft: 26, fontSize: '0.85rem', color: '#64748b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {fmt(node.newValue ?? node.oldValue)}
          </div>
        );
      }
    }
  }

  return (
    <div style={indentStyle}>
      {header}
      {body}
    </div>
  );
}

// ── Main DiffView ─────────────────────────────────────────────────────────────

export default function DiffView({ run }) {
  const versions = useMemo(
    () => [...(run?.versions ?? [])].sort((a, b) => a.versionNumber - b.versionNumber),
    [run]
  );
  const [vA, setVA] = useState(versions.length >= 2 ? versions.at(-2).versionNumber : null);
  const [vB, setVB] = useState(versions.length >= 1 ? versions.at(-1).versionNumber : null);

  const versionA = versions.find(v => v.versionNumber === vA);
  const versionB = versions.find(v => v.versionNumber === vB);

  const diffResult = useMemo(() => {
    if (!versionA || !versionB || vA === vB) return null;
    return diffDocuments(versionA.data, versionB.data);
  }, [versionA, versionB]);

  const stats = useMemo(() => (diffResult ? countDiffStats(diffResult) : null), [diffResult]);
  
  // Filter out completely unchanged top-level sections for cleaner view
  const sections = useMemo(
    () => (diffResult?.children ?? []).filter(c => c.type !== 'unchanged'),
    [diffResult]
  );

  if (versions.length < 2) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">⚖️</span>
        <h3>Need at least 2 versions to diff</h3>
        <p>Upload another version of this run to compare them.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '9px 14px', background: '#0f1020',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, marginBottom: 24,
      }}>
        {/* BASE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em' }}>BASE</span>
          <select className="select" value={vA ?? ''} onChange={e => setVA(Number(e.target.value))} id="diff-va"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '3px 26px 3px 8px' }}>
            {versions.map(v => <option key={v.versionNumber} value={v.versionNumber} disabled={v.versionNumber === vB}>v{v.versionNumber} — {v.sourceFilename}</option>)}
          </select>
        </div>

        <span style={{ fontFamily: 'var(--font-mono)', color: '#374151' }}>→</span>

        {/* HEAD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em' }}>HEAD</span>
          <select className="select" value={vB ?? ''} onChange={e => setVB(Number(e.target.value))} id="diff-vb"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '3px 26px 3px 8px' }}>
            {versions.map(v => <option key={v.versionNumber} value={v.versionNumber} disabled={v.versionNumber === vA}>v{v.versionNumber} — {v.sourceFilename}</option>)}
          </select>
        </div>

        {stats && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>+{stats.added}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>−{stats.removed}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>~{stats.changed}</span>
            <span style={{ fontSize: '0.76rem', color: '#475569' }}>{stats.unchanged} unchanged</span>
          </div>
        )}
      </div>

      {/* ── Tree View ── */}
      {!diffResult ? (
        <div className="empty-state"><h3>Select two different versions to compare</h3></div>
      ) : sections.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">✅</span>
          <h3>No differences</h3>
          <p>Both versions are identical.</p>
        </div>
      ) : (
        <div style={{ background: '#0b0c16', padding: '16px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
          {sections.map(sec => (
            <DiffTreeNode key={String(sec.key)} node={sec} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
