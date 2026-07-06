/**
 * Schema helpers — known-section detection.
 * The app detects known top-level and sub-sections by key name.
 * Anything not in these sets is rendered by GenericTree.
 */

export const KNOWN_TOP_LEVEL_KEYS = new Set([
  'situational_analysis',
  'insight_rows',
  'strategic_imperatives',
]);

export const KNOWN_SA_KEYS = new Set([
  'swot',
  'pestle',
  'patient_journey',
  'source_of_business',
  'competitor_analysis',
  'hcp_drivers_barriers',
]);

export const KNOWN_SWOT_QUADRANTS = ['strengths', 'weaknesses', 'opportunities', 'threats'];
export const KNOWN_PESTLE_CATEGORIES = ['political', 'economic', 'social', 'technological', 'legal', 'environmental'];

/**
 * Splits all top-level keys of a data object into known and unknown sections.
 * @param {object} data - raw parsed JSON
 * @returns {{ known: string[], unknown: string[] }}
 */
export function classifyTopLevelKeys(data) {
  if (!data || typeof data !== 'object') return { known: [], unknown: [] };
  const keys = Object.keys(data);
  return {
    known: keys.filter(k => KNOWN_TOP_LEVEL_KEYS.has(k)),
    unknown: keys.filter(k => !KNOWN_TOP_LEVEL_KEYS.has(k)),
  };
}

/**
 * Given the situational_analysis object, returns present known and unknown sub-keys.
 */
export function classifySAKeys(sa) {
  if (!sa || typeof sa !== 'object') return { known: [], unknown: [] };
  const keys = Object.keys(sa);
  return {
    known: keys.filter(k => KNOWN_SA_KEYS.has(k)),
    unknown: keys.filter(k => !KNOWN_SA_KEYS.has(k)),
  };
}

/**
 * Returns a display label for a known SA key.
 */
export const SA_LABELS = {
  swot: 'SWOT Analysis',
  pestle: 'PESTLE',
  patient_journey: 'Patient Journey',
  source_of_business: 'Source of Business',
  competitor_analysis: 'Competitor Analysis',
  hcp_drivers_barriers: 'HCP Drivers & Barriers',
};

export const PIPELINE_STAGES = [
  { key: 'situational_analysis', label: 'Situational Analysis', icon: '🔍' },
  { key: 'insight_rows', label: 'Insight Rows', icon: '💡' },
  { key: 'strategic_imperatives', label: 'Strategic Imperatives', icon: '🎯' },
];

/**
 * Stable ID resolution for array-of-object diffing.
 * Priority: signal_id → atom_id → id → composite → index
 */
export function resolveItemId(item, index) {
  if (!item || typeof item !== 'object') return String(index);
  if (item.signal_id != null) return `sig::${item.signal_id}`;
  if (item.atom_id != null) return `atom::${item.atom_id}`;
  if (item.id != null) return `id::${item.id}`;
  // Composite: theme + headline title or headline first 30 chars
  const theme = item.theme ?? '';
  const hl = item.headline?.title ?? item.headline ?? item.name ?? item.claim ?? '';
  const composite = `${theme}::${String(hl).slice(0, 40)}`;
  if (composite.length > 2) return `composite::${composite}`;
  return `idx::${index}`;
}
