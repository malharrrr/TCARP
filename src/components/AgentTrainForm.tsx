import React, { useState } from 'react';
import axios from 'axios';
import TrainingMetricsChart from './TrainingMetricsChart';

interface Metric { step: number; reward: number; }

export default function AgentTrainForm() {
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOG');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2022-12-31');
  const [timesteps, setTimesteps] = useState(5000);
  const [modelId, setModelId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setModelId(null);
    setMetrics(null);

    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/agent/train', {
        symbols: symList,
        start_date: startDate,
        end_date: endDate,
        total_timesteps: timesteps
      });
      setModelId(res.data.model_id);
      setMetrics(res.data.metrics);
    } catch (err: any) {
      const d = err.response?.data;
      const msg = typeof d === 'object'
        ? (d.detail ?? JSON.stringify(d))
        : (d ?? err.message);
      console.error('API error payload:', d);
      setError(msg);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* existing form fields... */}
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Train & View Metrics</button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
      {modelId && <p className="mt-2">Model ID: <code>{modelId}</code></p>}
      {metrics && <TrainingMetricsChart data={metrics} />}
    </div>
  );
}