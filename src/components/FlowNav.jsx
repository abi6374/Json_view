import { PIPELINE_STAGES } from '../lib/schema.js';

export default function FlowNav({ activeStage, onStageChange, data }) {
  // Determine which stages exist in the data
  const available = PIPELINE_STAGES.filter(s => data && data[s.key] != null);

  return (
    <nav className="flow-nav" aria-label="Pipeline stages">
      {PIPELINE_STAGES.map((stage, i) => {
        const isAvailable = available.some(s => s.key === stage.key);
        const isActive = activeStage === stage.key;
        const isLast = i === PIPELINE_STAGES.length - 1;

        return (
          <div key={stage.key} className="flow-stage-wrapper">
            <button
              className={`flow-stage-btn ${isActive ? 'active' : ''} ${!isAvailable ? 'unavailable' : ''}`}
              onClick={() => isAvailable && onStageChange(stage.key)}
              disabled={!isAvailable}
              id={`flow-btn-${stage.key}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="flow-stage-icon">{stage.icon}</span>
              <span className="flow-stage-label">{stage.label}</span>
              {!isAvailable && <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>—</span>}
            </button>
            {!isLast && (
              <div className="flow-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .flow-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: var(--space-3) var(--space-4);
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
        }
        .flow-stage-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .flow-stage-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .flow-stage-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border);
        }
        .flow-stage-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 0 16px var(--primary-glow);
        }
        .flow-stage-btn.unavailable { opacity: 0.4; cursor: not-allowed; }
        .flow-stage-icon { font-size: 1rem; }
        .flow-stage-label { font-weight: 600; }
        .flow-arrow { color: var(--text-muted); display: flex; }
      `}</style>
    </nav>
  );
}
