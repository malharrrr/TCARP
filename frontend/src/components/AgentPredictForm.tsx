import React, { useState } from 'react';
import axios from 'axios';

export default function AgentPredictForm() {
  const [modelId, setModelId] = useState('');
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOG');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2022-12-31');
  const [actions, setActions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActions(null);

    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/agent/predict', {
        model_id: modelId,
        symbols: symList,
        start_date: startDate,
        end_date: endDate
      });
      const mapped = (res.data.actions as number[])
        .map(i => symList[i] || `idx${i}`);
      setActions(mapped);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium">Model ID:</label>
        <input className="border px-2 py-1 rounded w-full"
          value={modelId}
          onChange={e => setModelId(e.target.value)}
        />
      </div>
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
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Predict</button>
      {error && <p className="text-red-500">{error}</p>}
      {actions && (
        <div className="mt-4">
          <strong>Actions:</strong>
          <ul className="list-disc list-inside">
            {actions.map((sym, i) => <li key={i}>{sym}</li>)}
          </ul>
        </div>
      )}
    </form>
  );
}
