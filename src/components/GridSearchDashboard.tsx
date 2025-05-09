import React, { useState } from 'react';
import axios from 'axios';

interface GridResult {
  alpha: number;
  timesteps: number;
  sharpe: number;
  sortino: number;
}

export default function GridSearchDashboard() {
  const [symbols, setSymbols] = useState('AAPL,MSFT');
  const [startDate, setStartDate] = useState('2021-01-01');
  const [endDate, setEndDate] = useState('2021-12-31');
  const [alphas, setAlphas] = useState('0.01,0.05,0.1');
  const [timesteps, setTimesteps] = useState('1000,5000');
  const [results, setResults] = useState<GridResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    setResults([]);
    try {
      const req = {
        symbols: symbols.split(',').map((s) => s.trim()).filter(Boolean),
        start_date: startDate,
        end_date: endDate,
        alphas: alphas.split(',').map((a) => parseFloat(a)),
        timesteps: timesteps.split(',').map((n) => parseInt(n)),
      };
      const res = await axios.post<{ results: GridResult[] }>(
        'http://localhost:8000/gridsearch/run',
        req
      );
      setResults(res.data.results);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Parameter Sweep / Grid Search</h2>
      <div className="space-y-2">
        <input
          placeholder="Symbols CSV"
          className="border px-2 py-1 rounded w-full"
          value={symbols}
          onChange={(e) => setSymbols(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            className="border px-2 py-1 rounded w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border px-2 py-1 rounded w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <input
          placeholder="Alphas (CSV)"
          className="border px-2 py-1 rounded w-full"
          value={alphas}
          onChange={(e) => setAlphas(e.target.value)}
        />
        <input
          placeholder="Timesteps (CSV)"
          className="border px-2 py-1 rounded w-full"
          value={timesteps}
          onChange={(e) => setTimesteps(e.target.value)}
        />
        <button
          onClick={handleRun}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Run Grid Search
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {results.length > 0 && (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Alpha</th>
              <th className="border px-2 py-1">Timesteps</th>
              <th className="border px-2 py-1">Sharpe</th>
              <th className="border px-2 py-1">Sortino</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{r.alpha}</td>
                <td className="border px-2 py-1">{r.timesteps}</td>
                <td className="border px-2 py-1">{r.sharpe.toFixed(2)}</td>
                <td className="border px-2 py-1">{r.sortino.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
