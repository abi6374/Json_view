import { useState, useMemo } from 'react';
import { diffDocuments, countDiffStats } from '../lib/diff.js';
import { renderValue } from './GenericTree.jsx';

function ValueDisplay({ value, type }) {
  const color = type === 'added' ? 'var(--diff-added)' : type === 'removed' ? 'var(--diff-removed)' : 'var(--text-secondary)';
  return (
    <div style={{ padding: '4px 8px', background: type === 'added' ? 'var(--diff-added-bg)' : type === 'removed' ? 'var(--diff-removed-bg)' : 'transparent', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color }}>
      {renderValue(value)}
    </div>
  );
}

function DiffRow({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const [showUnchanged, setShowUnchanged] = useState(false);

  if (node.type === 'unchanged' && depth === 0) return null;

  const hasChildren = node.children && node.children.length > 0;
  const unchangedChildren = hasChildren ? node.children.filter(c => c.type === 'unchanged') : [];
  const changedChildren = hasChildren ? node.children.filter(c => c.type !== 'unchanged') : [];

  const indent = depth * 16;

  const typeColors = {
    added:     { bg: 'var(--diff-added-bg)',   border: 'var(--diff-added)',   label: '+ Added' },
    removed:   { bg: 'var(--diff-removed-bg)', border: 'var(--diff-removed)', label: '− Removed' },
    changed:   { bg: 'var(--diff-changed-bg)', border: 'var(--diff-changed)', label: '~ Changed' },
    unchanged: { bg: 'transparent',             border: 'transparent',         label: '= Unchanged' },
  };
  const tc = typeColors[node.type] ?? typeColors.changed;

  if (!hasChildren) {
    // Leaf node
    return (
      <div style={{
        paddingLeft: indent + 12,
        paddingTop: 4, paddingBottom: 4,
        borderLeft: depth > 0 ? '1px solid var(--border-subtle)' : 'none',
        marginLeft: depth > 0 ? indent : 0,
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: tc.border, flexShrink: 0, marginTop: 6,
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--primary-light)', minWidth: 80 }}>
            {String(node.key)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {node.type === 'changed' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--diff-removed)', fontWeight: 700, marginBottom: 2 }}>Before</div>
                <ValueDisplay value={node.oldValue} type="removed" />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: 20 }}>→</div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--diff-added)', fontWeight: 700, marginBottom: 2 }}>After</div>
                <ValueDisplay value={node.newValue} type="added" />
              </div>
            </div>
          )}
          {node.type === 'added' && <ValueDisplay value={node.newValue} type="added" />}
          {node.type === 'removed' && <ValueDisplay value={node.oldValue} type="removed" />}
          {node.type === 'unchanged' && <ValueDisplay value={node.newValue} type="unchanged" />}
        </div>
      </div>
    );
  }

  // Branch node
  return (
    <div style={{ marginLeft: depth > 0 ? indent : 0, paddingLeft: depth > 0 ? 0 : 0 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 'var(--radius-sm)',
          background: depth === 0 ? 'var(--bg-elevated)' : 'transparent',
          cursor: hasChildren ? 'pointer' : 'default',
          marginBottom: 4,
        }}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        {hasChildren && (
          <svg
            style={{ transition: 'transform 200ms', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-muted)', flexShrink: 0 }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600 }}>
          {String(node.key)}
        </span>
        {node.type !== 'unchanged' && (
          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 'var(--radius-full)', background: tc.bg, color: tc.border, border: `1px solid ${tc.border}44`, fontWeight: 600 }}>
            {tc.label}
          </span>
        )}
        {hasChildren && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 4 }}>
            ({changedChildren.length} changes, {unchangedChildren.length} same)
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div style={{ borderLeft: '1px solid var(--border-subtle)', marginLeft: 8, paddingLeft: 4 }}>
          {changedChildren.map((child, i) => (
            <DiffRow key={`${child.key}-${i}`} node={child} depth={depth + 1} />
          ))}
          {unchangedChildren.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {showUnchanged ? (
                <>
                  {unchangedChildren.map((child, i) => (
                    <DiffRow key={`${child.key}-${i}`} node={child} depth={depth + 1} />
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setShowUnchanged(false); }}>
                    Hide {unchangedChildren.length} unchanged
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); setShowUnchanged(true); }}
                  style={{ color: 'var(--text-muted)' }}
                >
                  ··· {unchangedChildren.length} unchanged {unchangedChildren.length === 1 ? 'field' : 'fields'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiffView({ run }) {
  const versions = run?.versions ?? [];
  const [vA, setVA] = useState(versions.length >= 2 ? versions[versions.length - 2].versionNumber : null);
  const [vB, setVB] = useState(versions.length >= 1 ? versions[versions.length - 1].versionNumber : null);

  const versionA = versions.find(v => v.versionNumber === vA);
  const versionB = versions.find(v => v.versionNumber === vB);

  const diffResult = useMemo(() => {
    if (!versionA || !versionB) return null;
    return diffDocuments(versionA.data, versionB.data);
  }, [versionA, versionB]);

  const stats = useMemo(() => {
    if (!diffResult) return null;
    return countDiffStats(diffResult);
  }, [diffResult]);

  if (versions.length < 2) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">⚖️</span>
        <h3>Need at least 2 versions to diff</h3>
        <p>Upload another version of this run to compare them.</p>
      </div>
    );
  }

  const topLevelChanged = diffResult?.children?.filter(c => c.type !== 'unchanged') ?? [];

  return (
    <div>
      {/* Version selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Compare:</span>
          <select className="select" value={vA ?? ''} onChange={e => setVA(Number(e.target.value))} id="diff-version-a" style={{ width: 'auto' }}>
            {versions.map(v => (
              <option key={v.versionNumber} value={v.versionNumber} disabled={v.versionNumber === vB}>
                v{v.versionNumber} — {v.sourceFilename}
              </option>
            ))}
          </select>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select className="select" value={vB ?? ''} onChange={e => setVB(Number(e.target.value))} id="diff-version-b" style={{ width: 'auto' }}>
            {versions.map(v => (
              <option key={v.versionNumber} value={v.versionNumber} disabled={v.versionNumber === vA}>
                v{v.versionNumber} — {v.sourceFilename}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span className="badge badge-success">+{stats.added} added</span>
            <span className="badge badge-danger">−{stats.removed} removed</span>
            <span className="badge badge-warning">~{stats.changed} changed</span>
            <span className="badge badge-neutral">={stats.unchanged} same</span>
          </div>
        )}
      </div>

      {/* Diff tree */}
      {diffResult && (
        <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 'var(--space-4)' }}>
          {topLevelChanged.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <span className="empty-state-icon">✅</span>
              <h3>No differences found</h3>
              <p>Both versions are identical.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {topLevelChanged.map((child, i) => (
                <DiffRow key={`${child.key}-${i}`} node={child} depth={0} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
