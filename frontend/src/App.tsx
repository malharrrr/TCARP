import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import CausalDashboard from './components/CausalDashboard';
import TrainingDashboard from './components/TrainingDashboard';
import ExplainabilityTabs from './components/ExplainabilityTabs';

type View =
  | 'health'
  | 'causal'
  | 'train'
  | 'explainability';

export default function App() {
  const [view, setView] = useState<View>('health');
  const [health, setHealth] = useState('Loading…');

  const refreshHealth = () => {
    fetch('http://localhost:8000/health/')
      .then((res) => res.json())
      .then((data) =>
        setHealth(`Status: ${data.status} at ${data.checked_at}`)
      )
      .catch(() => setHealth('Error fetching health'));
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  return (
    <Layout>
      <nav className="mb-6 space-x-2">
        <button
          onClick={() => {
            setView('health');
            refreshHealth();
          }}
          className="px-3 py-1 bg-gray-600 text-white rounded"
        >
          Health
        </button>
        <button
          onClick={() => setView('causal')}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Causal
        </button>
        <button
          onClick={() => setView('train')}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Training
        </button>
        <button
          onClick={() => setView('explainability')}
          className="px-3 py-1 bg-purple-600 text-white rounded"
        >
          Explainability
        </button>
      </nav>

      {view === 'health' && <p>{health}</p>}
      {view === 'causal' && <CausalDashboard />}
      {view === 'train' && <TrainingDashboard />}
      {view === 'explainability' && <ExplainabilityTabs />}
    </Layout>
  );
}
