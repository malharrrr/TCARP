import React, { useState } from 'react';
import axios from 'axios';

export default function AgentTrainForm() {
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOG');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2022-12-31');
  const [timesteps, setTimesteps] = useState(5000);
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setModelId(null);
    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/agent/train', {
        symbols: symList,
        start_date: startDate,
        end_date: endDate,
        total_timesteps: timesteps
      });
      setModelId(res.data.model_id);
    } catch (err: any) {
      setError(err.response?.data || err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium">Symbols (comma-separated):</label>
        <input className="border px-2 py-1 rounded w-full"
          value={symbols}
          onChange={e => setSymbols(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Start Date:</label>
          <input type="date" className="border px-2 py-1 rounded w-full"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium">End Date:</label>
          <input type="date" className="border px-2 py-1 rounded w-full"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block font-medium">Timesteps:</label>
        <input type="number" className="border px-2 py-1 rounded w-full"
          value={timesteps}
          onChange={e => setTimesteps(parseInt(e.target.value))}
        />
      </div>
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Train</button>
      {error && <p className="text-red-500">{error}</p>}
      {modelId && <p className="mt-2">Trained! Model ID: <code>{modelId}</code></p>}
    </form>
  );
}
