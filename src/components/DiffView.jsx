import { useState, useMemo } from 'react';
import { diffDocuments, countDiffStats } from '../lib/diff.js';

// ── Value formatter — NO truncation ─────────────────────────────────────────
function fmt(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;          // full string, no cut
  if (Array.isArray(val))      return `[ ${val.length} items ]`;
  if (typeof val === 'object') return `{ ${Object.keys(val).length} fields }`;
  return String(val);
}

const IND = '  '; // indent step

// ── Flatten diff tree → rows ──────────────────────────────────────────────────
// Each row: { type, left, right, depth }
//   type: 'unchanged' | 'added' | 'removed' | 'changed'
//   left : string | null   (null = empty cell on left side)
//   right: string | null   (null = empty cell on right side)
function flattenToRows(node, depth = 0, forceType = null) {
  const rows = [];
  const t     = forceType ?? node.type;
  const key   = String(node.key);
  const ind   = IND.repeat(depth);

  if (t === 'unchanged') {
    if (!node.children || node.children.length === 0) {
      const txt = `${ind}${key}: ${fmt(node.newValue ?? node.oldValue)}`;
      rows.push({ type: 'unchanged', left: txt, right: txt, depth });
    } else {
      const txt = `${ind}${key}  ··· (${node.children.length} fields, unchanged)`;
      rows.push({ type: 'unchanged', left: txt, right: txt, depth, collapsed: true });
    }
    return rows;
  }

  if (t === 'added') {
    if (!node.children || node.children.length === 0) {
      rows.push({ type: 'added', left: null, right: `${ind}${key}: ${fmt(node.newValue)}`, depth });
    } else {
      rows.push({ type: 'added', left: null, right: `${ind}${key}:`, depth });
      (node.children ?? []).forEach(c => rows.push(...flattenToRows(c, depth + 1, 'added')));
    }
    return rows;
  }

  if (t === 'removed') {
    if (!node.children || node.children.length === 0) {
      rows.push({ type: 'removed', left: `${ind}${key}: ${fmt(node.oldValue)}`, right: null, depth });
    } else {
      rows.push({ type: 'removed', left: `${ind}${key}:`, right: null, depth });
      (node.children ?? []).forEach(c => rows.push(...flattenToRows(c, depth + 1, 'removed')));
    }
    return rows;
  }

  // t === 'changed'
  if (node.children && node.children.length > 0) {
    node.children.forEach(c => rows.push(...flattenToRows(c, depth, null)));
    return rows;
  }
  // leaf changed: show old→new
  rows.push({
    type: 'changed',
    left:  `${ind}${key}: ${fmt(node.oldValue)}`,
    right: `${ind}${key}: ${fmt(node.newValue)}`,
    depth,
  });
  return rows;
}

// ── Group rows: collapse large unchanged runs ─────────────────────────────────
const CTX = 3;

function groupIntoHunks(rows) {
  const changed = new Set();
  rows.forEach((r, i) => { if (r.type !== 'unchanged') changed.add(i); });
  if (changed.size === 0) return [];

  const visible = new Set();
  changed.forEach(i => {
    for (let j = Math.max(0, i - CTX); j <= Math.min(rows.length - 1, i + CTX); j++) visible.add(j);
  });

  const out = [];
  let i = 0;
  while (i < rows.length) {
    if (visible.has(i)) {
      out.push({ kind: 'row', row: rows[i], idx: i });
      i++;
    } else {
      let start = i;
      while (i < rows.length && !visible.has(i)) i++;
      out.push({ kind: 'skip', count: i - start, startIdx: start });
    }
  }
  return out;
}

// ── Cell styling ──────────────────────────────────────────────────────────────
const STYLE = {
  unchanged: { leftBg: 'transparent',  rightBg: 'transparent',  leftBorder: 'transparent',  rightBorder: 'transparent',  leftPrefix: ' ',  rightPrefix: ' ',  leftPfxClr: '#374151', rightPfxClr: '#374151', leftTxt: '#64748b', rightTxt: '#64748b'  },
  added:     { leftBg: '#0a0c0e',       rightBg: '#0d2818',       leftBorder: 'transparent',  rightBorder: '#22c55e',      leftPrefix: ' ',  rightPrefix: '+',  leftPfxClr: '#374151', rightPfxClr: '#22c55e', leftTxt: 'transparent',rightTxt: '#bbf7d0' },
  removed:   { leftBg: '#2d0f0f',       rightBg: '#0a0c0e',       leftBorder: '#ef4444',      rightBorder: 'transparent',  leftPrefix: '-',  rightPrefix: ' ',  leftPfxClr: '#ef4444', rightPfxClr: '#374151', leftTxt: '#fecaca',    rightTxt: 'transparent' },
  changed:   { leftBg: '#1e1100',       rightBg: '#0a1e0d',       leftBorder: '#f59e0b',      rightBorder: '#22c55e',      leftPrefix: '-',  rightPrefix: '+',  leftPfxClr: '#f59e0b', rightPfxClr: '#22c55e', leftTxt: '#fde68a',    rightTxt: '#bbf7d0' },
};

// ── Single side-by-side row ───────────────────────────────────────────────────
function DiffRow({ row, lNum, rNum }) {
  const s = STYLE[row.type] ?? STYLE.unchanged;

  const cell = (side) => {
    const bg      = side === 'left' ? s.leftBg      : s.rightBg;
    const border  = side === 'left' ? s.leftBorder  : s.rightBorder;
    const pfx     = side === 'left' ? s.leftPrefix  : s.rightPrefix;
    const pfxClr  = side === 'left' ? s.leftPfxClr  : s.rightPfxClr;
    const txtClr  = side === 'left' ? s.leftTxt     : s.rightTxt;
    const lineNum = side === 'left' ? lNum           : rNum;
    const text    = side === 'left' ? row.left       : row.right;

    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', background: bg, borderLeft: `3px solid ${border}` }}>
        {/* Line number */}
        <div style={{
          width: 42, flexShrink: 0, textAlign: 'right',
          padding: '1px 6px 1px 0', color: '#374151',
          fontSize: '0.7rem', lineHeight: '1.6',
          fontFamily: 'var(--font-mono)', userSelect: 'none',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}>
          {lineNum ?? ''}
        </div>
        {/* +/- prefix */}
        <div style={{
          width: 18, flexShrink: 0, textAlign: 'center',
          color: pfxClr, fontFamily: 'var(--font-mono)',
          fontWeight: 700, fontSize: '0.8rem', lineHeight: '1.6',
          userSelect: 'none',
        }}>
          {text != null ? pfx : ''}
        </div>
        {/* Content */}
        <div style={{
          flex: 1, minWidth: 0,
          padding: '2px 12px 2px 0',
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          lineHeight: '1.7', color: text != null ? txtClr : 'transparent',
          whiteSpace: 'pre-wrap',   /* wrap — never clip */
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}>
          {text ?? ' '}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      {cell('left')}
      <div style={{ width: 1, flexShrink: 0, background: 'rgba(255,255,255,0.05)' }} />
      {cell('right')}
    </div>
  );
}

// ── Collapsed-range expander row ──────────────────────────────────────────────
function SkipRow({ count, onExpand }) {
  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <button
        style={{
          flex: 1, padding: '3px 0 3px 62px',
          background: 'rgba(99,102,241,0.06)',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          color: '#6366f1', fontFamily: 'var(--font-mono)', fontSize: '0.74rem',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
        }}
        onClick={onExpand}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {count} unchanged {count === 1 ? 'line' : 'lines'}
      </button>
    </div>
  );
}

// ── Per-section diff block ────────────────────────────────────────────────────
function SectionBlock({ node, vA, vB }) {
  const [closed, setClosed] = useState(false);
  const [expanded, setExpanded] = useState(new Set()); // expanded skip blocks by startIdx

  const allRows = useMemo(() => flattenToRows(node, 0), [node]);

  // Gather stats
  const stats = useMemo(() => {
    let add = 0, rem = 0, chg = 0;
    allRows.forEach(r => { if (r.type === 'added') add++; else if (r.type === 'removed') rem++; else if (r.type === 'changed') chg++; });
    return { add, rem, chg };
  }, [allRows]);

  const grouped = useMemo(() => groupIntoHunks(allRows), [allRows]);

  const typeColor = node.type === 'added' ? '#22c55e' : node.type === 'removed' ? '#ef4444' : '#f59e0b';
  const typeLabel = node.type === 'added' ? '+ added' : node.type === 'removed' ? '− removed' : '~ modified';

  // Line counters (track across rows)
  let lLine = 1, rLine = 1;
  const renderedItems = grouped.flatMap((item, gi) => {
    if (item.kind === 'skip') {
      const isExp = expanded.has(item.startIdx);
      if (isExp) {
        // show the skipped rows
        return allRows.slice(item.startIdx, item.startIdx + item.count).map((row, si) => {
          const lN = row.left  != null ? lLine++ : null;
          const rN = row.right != null ? rLine++ : null;
          return <DiffRow key={`skip-${gi}-${si}`} row={row} lNum={lN} rNum={rN} />;
        });
      }
      const preLLine = lLine, preRLine = rLine;
      // still advance counters for skipped unchanged lines
      allRows.slice(item.startIdx, item.startIdx + item.count).forEach(row => {
        if (row.left  != null) lLine++;
        if (row.right != null) rLine++;
      });
      return [
        <SkipRow
          key={`skip-${gi}`}
          count={item.count}
          onExpand={() => setExpanded(s => { const n = new Set(s); n.add(item.startIdx); return n; })}
        />
      ];
    }
    // kind === 'row'
    const row = item.row;
    const lN = row.left  != null ? lLine++ : null;
    const rN = row.right != null ? rLine++ : null;
    return [<DiffRow key={`r-${item.idx}`} row={row} lNum={lN} rNum={rN} />];
  });

  return (
    <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* File header */}
      <div
        onClick={() => setClosed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 14px', background: '#13142a',
          borderBottom: closed ? 'none' : '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <svg style={{ transform: closed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: '150ms', flexShrink: 0 }}
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="3">
          <path d="M6 9l6 6 6-6" />
        </svg>
        {/* File icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#c7d2fe', fontWeight: 600, flex: 1 }}>
          {String(node.key)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '1px 7px', borderRadius: 3, background: `${typeColor}1a`, color: typeColor, fontWeight: 700 }}>
          {typeLabel}
        </span>
        {stats.add > 0  && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>+{stats.add}</span>}
        {stats.rem > 0  && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>−{stats.rem}</span>}
        {stats.chg > 0  && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>~{stats.chg}</span>}
      </div>

      {!closed && (
        <>
          {/* Column headers */}
          <div style={{ display: 'flex', background: '#0f1020', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { dot: '#ef4444', label: `v${vA?.versionNumber}  —  ${vA?.sourceFilename ?? '…'}` },
              { dot: '#22c55e', label: `v${vB?.versionNumber}  —  ${vB?.sourceFilename ?? '…'}` },
            ].map(({ dot, label }, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 62px', fontSize: '0.7rem', color: '#374151', fontFamily: 'var(--font-mono)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                {label}
                {i === 0 && <div style={{ marginLeft: 'auto', width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />}
              </div>
            ))}
          </div>

          {/* Diff rows */}
          <div style={{ background: '#0b0d1c' }}>
            {renderedItems.length === 0 ? (
              <div style={{ padding: '10px 62px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#374151', fontStyle: 'italic' }}>
                No changes in this section
              </div>
            ) : renderedItems}
          </div>
        </>
      )}
    </div>
  );
}

// ── Root DiffView ─────────────────────────────────────────────────────────────
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

  const stats    = useMemo(() => (diffResult ? countDiffStats(diffResult) : null), [diffResult]);
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
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, marginBottom: 16,
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

      {/* ── Sections ── */}
      {!diffResult ? (
        <div className="empty-state"><h3>Select two different versions to compare</h3></div>
      ) : sections.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">✅</span>
          <h3>No differences</h3>
          <p>Both versions are identical.</p>
        </div>
      ) : sections.map(sec => (
        <SectionBlock key={String(sec.key)} node={sec} vA={versionA} vB={versionB} />
      ))}
    </div>
  );
}
