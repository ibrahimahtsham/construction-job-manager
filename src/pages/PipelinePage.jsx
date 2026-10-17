import React from 'react';
import PipelineBoard from '../components/jobs/PipelineBoard.jsx';

function PipelinePage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28, fontWeight: 700, letterSpacing: '0.12em',
          color: '#f0ede8', margin: 0, lineHeight: 1, textTransform: 'uppercase',
        }}>
          Pipeline
        </h1>
        <div style={{ width: 3, height: 28, background: '#d4870a', borderRadius: 1 }} />
      </div>
      <PipelineBoard />
    </div>
  );
}

export default PipelinePage;
