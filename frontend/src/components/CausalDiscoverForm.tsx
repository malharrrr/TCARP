import React, { useState } from 'react';
import axios from 'axios';

interface Edge { source: string; target: string; }

export default function CausalDiscoverForm() {
  const [symbols, setSymbols] = useState('AAPL,MSFT');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2022-12-31');
  const [alpha, setAlpha] = useState(0.05);
  const [edges, setEdges] = useState<Edge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEdges(null);
    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/causal/discover', {
        symbols: symList,
        start_date: startDate,
        end_date: endDate,
        alpha: alpha
      });
      setEdges(res.data.edges);
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
      <div>
        <label className="block font-medium">Alpha:</label>
        <input type="number" step="0.01" className="border px-2 py-1 rounded w-full"
          value={alpha}
          onChange={e => setAlpha(parseFloat(e.target.value))}
        />
      </div>
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Discover</button>
      {error && <p className="text-red-500">{error}</p>}
      {edges && (
        <table className="table-auto mt-4 w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Source</th>
              <th className="border px-2 py-1">Target</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((e, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{e.source}</td>
                <td className="border px-2 py-1">{e.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </form>
  );
}
