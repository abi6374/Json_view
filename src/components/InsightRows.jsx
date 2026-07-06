import { useState } from 'react';
import DiffBadge from './DiffBadge.jsx';
import { getDiffChild } from '../lib/diff.js';

function InsightSection({ label, content, isOpen, onToggle }) {
  if (!content) return null;
  const body = Array.isArray(content.body) ? content.body : (content.body ? [content.body] : []);
  const title = content.title ?? label;

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
      <div
        className="accordion-header"
        style={{ padding: '8px 0' }}
        onClick={onToggle}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{title}</div>
        <svg className={`accordion-icon ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {isOpen && (
        <div className="accordion-body" style={{ paddingBottom: 10 }}>
          {body.length === 0 && content.body && typeof content.body === 'string' && content.body.trim() ? (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{content.body}</p>
          ) : body.length > 0 ? (
            <ul style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {body.map((item, i) => (
                <li key={i} style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</p>
          )}
        </div>
      )}
    </div>
  );
}

const THEME_COLORS = {
  'HCP Adoption': '#6366f1',
  'Competitive':  '#f59e0b',
  'Adherence':    '#22c55e',
  'Access':       '#3b82f6',
  'Market':       '#8b5cf6',
};

function InsightCard({ insight, diffNode, onSignalClick, onInsightClick }) {
  const [openSection, setOpenSection] = useState(null);
  const dtype = diffNode?.type;
  const themeColor = THEME_COLORS[insight.theme] ?? 'var(--primary)';

  const toggle = (key) => setOpenSection(s => s === key ? null : key);

  return (
    <div
      className={`card ${dtype && dtype !== 'unchanged' ? `diff-${dtype}` : ''}`}
      style={{ marginBottom: 'var(--space-4)', borderLeft: `3px solid ${themeColor}` }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: `${themeColor}22`,
          border: `1px solid ${themeColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.85rem', color: themeColor, flexShrink: 0,
        }}>
          {insight.rank ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '0.95rem', lineHeight: 1.4, marginBottom: 6 }}>
            {insight.headline?.title ?? '—'}
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {insight.theme && (
              <span className="badge" style={{ background: `${themeColor}22`, color: themeColor, border: `1px solid ${themeColor}44` }}>
                {insight.theme}
              </span>
            )}
            {insight.insight_type && <span className="badge badge-neutral">{insight.insight_type}</span>}
            {insight.insight_score != null && (
              <span className="badge badge-primary">score: {insight.insight_score}</span>
            )}
            {insight.signal_id && (
              <button
                className="signal-chip"
                onClick={() => onSignalClick?.(insight.signal_id)}
                style={{ cursor: 'pointer' }}
                title={`Signal: ${insight.signal_id}`}
              >
                {insight.signal_id}
              </button>
            )}
            {insight.atom_id && (
              <span className="signal-chip" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.3)' }}>
                {insight.atom_id}
              </span>
            )}
            <DiffBadge type={dtype} />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        {[
          { key: 'why', label: 'Why' },
          { key: 'what', label: 'What' },
          { key: 'implications', label: 'Implications' },
          { key: 'actions', label: 'Actions' },
        ].map(({ key, label }) => (
          <InsightSection
            key={key}
            label={label}
            content={insight[key]}
            isOpen={openSection === key}
            onToggle={() => toggle(key)}
          />
        ))}
      </div>

      {/* Sources */}
      {Array.isArray(insight.sources) && insight.sources.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Sources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {insight.sources.map((s, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InsightRows({ data, diffNode, onSignalClick }) {
  const [sortBy, setSortBy] = useState('rank');
  const [filterTheme, setFilterTheme] = useState('');

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">💡</span>
        <h3>No insight rows</h3>
        <p>This section was not found in the uploaded JSON.</p>
      </div>
    );
  }

  const themes = [...new Set(data.map(i => i.theme).filter(Boolean))];

  const sorted = [...data]
    .filter(i => !filterTheme || i.theme === filterTheme)
    .sort((a, b) => {
      if (sortBy === 'rank') return (a.rank ?? 999) - (b.rank ?? 999);
      if (sortBy === 'score') return (b.insight_score ?? 0) - (a.insight_score ?? 0);
      return 0;
    });

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sort:</span>
          <div className="tab-bar">
            <button className={`tab-btn ${sortBy === 'rank' ? 'active' : ''}`} onClick={() => setSortBy('rank')} id="sort-rank">By Rank</button>
            <button className={`tab-btn ${sortBy === 'score' ? 'active' : ''}`} onClick={() => setSortBy('score')} id="sort-score">By Score</button>
          </div>
        </div>
        {themes.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Theme:</span>
            <select className="select" value={filterTheme} onChange={e => setFilterTheme(e.target.value)} id="theme-filter" style={{ width: 'auto' }}>
              <option value="">All themes</option>
              {themes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {sorted.length} / {data.length} insights
        </span>
      </div>

      {/* Cards */}
      {sorted.map(insight => {
        const itemDiff = diffNode ? diffNode.children?.find(c => {
          const k = String(c.key);
          return k.includes(insight.signal_id) || k.includes(insight.atom_id) || k.includes(insight.rank);
        }) : null;
        return (
          <InsightCard
            key={insight.signal_id ?? insight.atom_id ?? insight.rank}
            insight={insight}
            diffNode={itemDiff}
            onSignalClick={onSignalClick}
          />
        );
      })}
    </div>
  );
}
