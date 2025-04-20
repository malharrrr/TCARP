import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import CausalDiscoverForm from './components/CausalDiscoverForm';
import FeatureSelectForm from './components/FeatureSelectForm';
import AgentTrainForm from './components/AgentTrainForm';
import AgentPredictForm from './components/AgentPredictForm';

type View = 'health' | 'causal' | 'features' | 'train' | 'predict';

export default function App() {
  const [view, setView] = useState<View>('health');
  const [health, setHealth] = useState('Loading…');

  useEffect(() => {
    if (view === 'health') {
      fetch('http://localhost:8000/health/')
        .then(res => res.json())
        .then(data => setHealth(`Status: ${data.status} at ${data.checked_at}`))
        .catch(() => setHealth('Error fetching health'));
    }
  }, [view]);

  const btnClass = "px-4 py-2 bg-blue-600 text-white rounded";

  return (
    <Layout>
      <nav className="mb-6 space-x-4">
        <button className={btnClass} onClick={() => setView('health')}>Health</button>
        <button className={btnClass} onClick={() => setView('causal')}>Causal</button>
        <button className={btnClass} onClick={() => setView('features')}>Features</button>
        <button className={btnClass} onClick={() => setView('train')}>Train RL</button>
        <button className={btnClass} onClick={() => setView('predict')}>Predict RL</button>
      </nav>

      {view === 'health' && <p>{health}</p>}
      {view === 'causal' && <CausalDiscoverForm />}
      {view === 'features' && <FeatureSelectForm />}
      {view === 'train' && <AgentTrainForm />}
      {view === 'predict' && <AgentPredictForm />}
    </Layout>
  );
}
