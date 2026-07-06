import { useState, useRef } from 'react';
import { storage } from '../lib/storage.js';

export default function UploadPanel({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [pending, setPending] = useState(null); // { filename, data, family, marker }
  const [familyName, setFamilyName] = useState('');
  const [mode, setMode] = useState('new'); // 'new' | 'existing'
  const [existingRunId, setExistingRunId] = useState('');
  const inputRef = useRef();
  const runs = storage.listRuns();

  function handleFiles(files) {
    setParseError(null);
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const { family, marker } = storage.inferFamilyName(file.name);
        setPending({ filename: file.name, data, family, marker });
        setFamilyName(family);
        setMode(runs.length > 0 ? 'existing' : 'new');
        setExistingRunId(runs[0]?.id ?? '');
      } catch (err) {
        setParseError(`Parse error in "${file.name}": ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleConfirm() {
    if (!pending) return;
    try {
      let run;
      if (mode === 'new') {
        run = storage.createRun(familyName || pending.family, {
          sourceFilename: pending.filename,
          data: pending.data,
        });
      } else {
        storage.addVersion(existingRunId, {
          sourceFilename: pending.filename,
          data: pending.data,
        });
        run = storage.getRun(existingRunId);
      }
      setPending(null);
      setParseError(null);
      onUploadComplete?.(run);
    } catch (err) {
      setParseError(err.message);
    }
  }

  return (
    <>
      {/* Drop zone */}
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload JSON file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="upload-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Drop JSON file here</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>or click to browse</div>
        </div>
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="upload-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {parseError}
        </div>
      )}

      {/* Confirmation modal */}
      {pending && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setPending(null)}>
          <div className="modal">
            <h2 style={{ marginBottom: 'var(--space-1)' }}>Upload JSON File</h2>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-5)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{pending.filename}</strong>
              {pending.marker && <> · detected version <span className="badge badge-neutral">{pending.marker}</span></>}
            </p>

            {/* Family name */}
            <label style={{ display: 'block', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>Run name</div>
              <input
                className="input"
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                placeholder="e.g. run_demo"
                id="family-name-input"
              />
            </label>

            {/* Mode */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>Add as</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="radio" name="upload-mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} />
                  <span style={{ fontSize: '0.85rem' }}>Start a new run</span>
                </label>
                {runs.length > 0 && (
                  <label className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="radio" name="upload-mode" value="existing" checked={mode === 'existing'} onChange={() => setMode('existing')} />
                    <span style={{ fontSize: '0.85rem' }}>Add version to existing run</span>
                  </label>
                )}
              </div>
              {mode === 'existing' && runs.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <select
                    className="select"
                    value={existingRunId}
                    onChange={e => setExistingRunId(e.target.value)}
                    id="existing-run-select"
                    style={{ width: '100%' }}
                  >
                    {runs.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.versions.length} version{r.versions.length !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={!familyName.trim()}>
                Save Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          cursor: pointer;
          transition: all var(--transition-base);
          text-align: center;
        }
        .upload-zone:hover, .upload-zone.dragging {
          border-color: var(--primary);
          background: var(--primary-dim);
        }
        .upload-icon {
          width: 48px; height: 48px;
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          color: var(--primary-light);
          transition: all var(--transition-fast);
        }
        .upload-zone:hover .upload-icon, .upload-zone.dragging .upload-icon {
          background: var(--primary-dim);
          box-shadow: 0 0 16px var(--primary-glow);
        }
        .upload-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--diff-removed-bg);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--diff-removed);
          margin-top: var(--space-3);
        }
      `}</style>
    </>
  );
}
