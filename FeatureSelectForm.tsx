import React, { useState } from 'react';
import axios from 'axios';

export default function FeatureSelectForm() {
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOG');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2022-12-31');
  const [alpha, setAlpha] = useState(0.05);
  const [target, setTarget] = useState('AAPL');
  const [result, setResult] = useState<{
    parents: string[]; children: string[]; spouses: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/features/select', {
        symbols: symList,
        start_date: startDate,
        end_date: endDate,
        alpha,
        target
      });
      setResult(res.data);
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
        <label className="block font-medium">Symbols (comma-separated):</label>
        <input className="border px-2 py-1 rounded w-full"
          value={symbols}
          onChange={e => setSymbols(e.target.value)}
        />
      </div>
      <div>
        <label className="block font-medium">Target Symbol:</label>
        <input className="border px-2 py-1 rounded w-full"
          value={target}
          onChange={e => setTarget(e.target.value)}
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
        <label className="block font-medium">Alpha:</label>
        <input type="number" step="0.01" className="border px-2 py-1 rounded w-full"
          value={alpha}
          onChange={e => setAlpha(parseFloat(e.target.value))}
        />
      </div>
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Select</button>
      {error && <p className="text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 space-y-2">
          <div><strong>Parents:</strong> {result.parents.join(', ')}</div>
          <div><strong>Children:</strong> {result.children.join(', ')}</div>
          <div><strong>Spouses:</strong> {result.spouses.join(', ')}</div>
        </div>
      )}
    </form>
  );
}
