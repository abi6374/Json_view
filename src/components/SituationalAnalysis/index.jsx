import { useState } from 'react';
import { classifySAKeys, SA_LABELS, KNOWN_SA_KEYS } from '../../lib/schema.js';
import { getDiffChild } from '../../lib/diff.js';
import DiffBadge from '../DiffBadge.jsx';
import GenericTree from '../GenericTree.jsx';
import Swot from './Swot.jsx';
import Pestle from './Pestle.jsx';
import PatientJourney from './PatientJourney.jsx';
import SourceOfBusiness from './SourceOfBusiness.jsx';
import CompetitorAnalysis from './CompetitorAnalysis.jsx';
import HcpDriversBarriers from './HcpDriversBarriers.jsx';

const RENDERERS = {
  swot: Swot,
  pestle: Pestle,
  patient_journey: PatientJourney,
  source_of_business: SourceOfBusiness,
  competitor_analysis: CompetitorAnalysis,
  hcp_drivers_barriers: HcpDriversBarriers,
};

export default function SituationalAnalysis({ data, diffNode }) {
  const { known, unknown } = classifySAKeys(data);
  const allTabs = [...known, ...unknown];

  const [activeTab, setActiveTab] = useState(allTabs[0] ?? '');

  if (!data || allTabs.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🔍</span>
        <h3>No situational analysis data</h3>
        <p>This section was not found in the uploaded JSON.</p>
      </div>
    );
  }

  const Renderer = RENDERERS[activeTab] ?? null;
  const subData = data[activeTab];
  const subDiff = diffNode ? getDiffChild(diffNode, activeTab) : null;

  return (
    <div>
      {/* Sub-section tab bar */}
      <div className="tab-bar" style={{ marginBottom: 'var(--space-5)' }}>
        {allTabs.map(tab => {
          const dtype = diffNode ? getDiffChild(diffNode, tab)?.type : null;
          return (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`sa-tab-${tab}`}
              style={{ position: 'relative' }}
            >
              {SA_LABELS[tab] ?? tab.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {dtype && dtype !== 'unchanged' && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: dtype === 'added' ? 'var(--diff-added)' : dtype === 'removed' ? 'var(--diff-removed)' : 'var(--diff-changed)',
                }} />
              )}
              {!KNOWN_SA_KEYS.has(tab) && (
                <span className="badge badge-neutral" style={{ marginLeft: 4, fontSize: '0.6rem' }}>custom</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active section content */}
      {activeTab && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <h2>{SA_LABELS[activeTab] ?? activeTab.replace(/_/g, ' ')}</h2>
            <DiffBadge type={subDiff?.type} />
          </div>

          {Renderer ? (
            <Renderer data={subData} diffNode={subDiff} />
          ) : (
            <GenericTree data={subData} />
          )}
        </div>
      )}
    </div>
  );
}
