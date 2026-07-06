/**
 * Storage Adapter — localStorage implementation
 *
 * Interface contract (swap-safe — replace body of each function for a
 * REST backend without touching any component):
 *
 *   listRuns()                       → Run[]
 *   getRun(id)                       → Run | null
 *   saveRun(run)                     → void
 *   deleteRun(id)                    → void
 *   addVersion(runId, payload)       → Version
 *   deleteVersion(runId, vNum)       → void
 *
 * Run shape:
 *   { id, name, createdAt, versions: Version[] }
 *
 * Version shape:
 *   { versionNumber, timestamp, sourceFilename, data }
 */

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'agentlens_runs';

// ── internal helpers ──────────────────────────────────────────────────────────

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(runs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

// ── public interface ──────────────────────────────────────────────────────────

export function listRuns() {
  return readAll();
}

export function getRun(id) {
  return readAll().find(r => r.id === id) ?? null;
}

export function saveRun(run) {
  const all = readAll();
  const idx = all.findIndex(r => r.id === run.id);
  if (idx >= 0) {
    all[idx] = run;
  } else {
    all.unshift(run);
  }
  writeAll(all);
}

export function deleteRun(id) {
  writeAll(readAll().filter(r => r.id !== id));
}

/**
 * Create a brand-new run and store its first version.
 * @returns {Run} the created run
 */
export function createRun(name, versionPayload) {
  const run = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    versions: [],
  };
  const version = {
    versionNumber: 1,
    timestamp: new Date().toISOString(),
    sourceFilename: versionPayload.sourceFilename,
    data: versionPayload.data,
  };
  run.versions.push(version);
  saveRun(run);
  return run;
}

/**
 * Add a new version to an existing run.
 * @returns {Version} the created version
 */
export function addVersion(runId, versionPayload) {
  const all = readAll();
  const run = all.find(r => r.id === runId);
  if (!run) throw new Error(`Run not found: ${runId}`);
  const nextNum = run.versions.length > 0
    ? Math.max(...run.versions.map(v => v.versionNumber)) + 1
    : 1;
  const version = {
    versionNumber: nextNum,
    timestamp: new Date().toISOString(),
    sourceFilename: versionPayload.sourceFilename,
    data: versionPayload.data,
  };
  run.versions.push(version);
  writeAll(all);
  return version;
}

export function deleteVersion(runId, versionNumber) {
  const all = readAll();
  const run = all.find(r => r.id === runId);
  if (!run) return;
  run.versions = run.versions.filter(v => v.versionNumber !== versionNumber);
  if (run.versions.length === 0) {
    writeAll(all.filter(r => r.id !== runId));
  } else {
    writeAll(all);
  }
}

export function renameRun(runId, newName) {
  const all = readAll();
  const run = all.find(r => r.id === runId);
  if (!run) return;
  run.name = newName;
  writeAll(all);
}

/**
 * Infer a run family name and version marker from a filename.
 * e.g. "run_demo-005.json" → { family: "run_demo", marker: "005" }
 *      "analysis_v3.json"  → { family: "analysis", marker: "v3" }
 *      "output.json"       → { family: "output", marker: null }
 */
export function inferFamilyName(filename) {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, '');
  // Match trailing -NNN, _NNN, -vN, _vN patterns
  const match = base.match(/^(.+?)[-_](v?\d+)$/i);
  if (match) {
    return { family: match[1], marker: match[2] };
  }
  return { family: base, marker: null };
}

export const storage = {
  listRuns,
  getRun,
  saveRun,
  deleteRun,
  createRun,
  addVersion,
  deleteVersion,
  renameRun,
  inferFamilyName,
};
