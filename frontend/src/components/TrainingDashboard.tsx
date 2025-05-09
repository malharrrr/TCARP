import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import axios from 'axios';

export default function TrainingDashboard() {
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOG');
  const [startDate, setStartDate] = useState('2021-01-01');
  const [endDate, setEndDate] = useState('2021-12-31');
  const [timesteps, setTimesteps] = useState(5000);
  const [modelId, setModelId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{ step: number; reward: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setModelId(null);
    setMetrics([]);

    const syms = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/agent/train', {
        symbols: syms,
        start_date: startDate,
        end_date: endDate,
        total_timesteps: timesteps
      });
      setModelId(res.data.model_id);

      // placeholder metrics
      const dummy = Array.from({ length: 10 }, (_, i) => ({
        step: Math.round((i + 1) * (timesteps / 10)),
        reward: Math.random() * 2
      }));
      setMetrics(dummy);
    } catch (err: any) {
      const d = err.response?.data;
      const msg = typeof d === 'object' ? d.detail ?? JSON.stringify(d) : d ?? err.message;
      console.error('API error:', d);
      setError(msg);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleTrain} className="space-y-4">
        {/* Symbols */}
        <div>
          <div className="flex items-center space-x-1">
            <label className="font-medium">Symbols (CSV)</label>
            <div className="relative group inline-block">
              <span className="text-gray-500 cursor-pointer">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Comma‑separated tickers to train on.
              </div>
            </div>
          </div>
          <input
            className="mt-1 border px-2 py-1 rounded w-full"
            value={symbols}
            onChange={e => setSymbols(e.target.value)}
          />
        </div>

        {/* Dates & Timesteps */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center space-x-1">
              <label className="font-medium">Start Date</label>
              <div className="relative group inline-block">
                <span className="text-gray-500 cursor-pointer">?</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  First day (inclusive) of training data.
                </div>
              </div>
            </div>
            <input
              type="date"
              className="mt-1 border px-2 py-1 rounded w-full"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <label className="font-medium">End Date</label>
              <div className="relative group inline-block">
                <span className="text-gray-500 cursor-pointer">?</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Last day (inclusive) of training data.
                </div>
              </div>
            </div>
            <input
              type="date"
              className="mt-1 border px-2 py-1 rounded w-full"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <label className="font-medium">Timesteps</label>
              <div className="relative group inline-block">
                <span className="text-gray-500 cursor-pointer">?</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-52 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Number of PPO training iterations (higher = longer training).
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center space-x-2">
              <input
                type="range"
                min="1000"
                max="20000"
                step="1000"
                value={timesteps}
                onChange={e => setTimesteps(parseInt(e.target.value))}
              />
              <span className="w-16 text-right">{timesteps}</span>
            </div>
          </div>
        </div>

        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
          Train PPO Agent
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}
      {modelId && (
        <p className="text-gray-700">
          Model trained! ID: <code>{modelId}</code>
        </p>
      )}

      {metrics.length > 0 && (
        <LineChart
          width={600}
          height={300}
          data={metrics}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="step" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="reward" stroke="#8884d8" />
        </LineChart>
      )}
    </div>
  );
}
