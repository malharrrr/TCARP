import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Scenario {
  id: number;
  name: string;
  config: any;
}

export default function ScenariosDashboard() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState('');
  const [configJson, setConfigJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = async () => {
    const res = await axios.get<Scenario[]>(
      'http://localhost:8000/scenarios/'
    );
    setScenarios(res.data);
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleCreate = async () => {
    setError(null);
    try {
      const config = JSON.parse(configJson);
      await axios.post('http://localhost:8000/scenarios/', { name, config });
      setName('');
      setConfigJson('{}');
      fetchScenarios();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    await axios.delete(`http://localhost:8000/scenarios/${id}`);
    fetchScenarios();
  };

  const handleRun = async (config: any) => {
    // reuse BacktestDashboard logic or call directly
    try {
      const res = await axios.post(
        'http://localhost:8000/backtest/run',
        config
      );
      alert(`Sharpe: ${res.data.sharpe.toFixed(2)}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Saved Scenarios</h2>
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-2">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center p-2 border rounded"
          >
            <span>{s.name}</span>
            <div className="space-x-2">
              <button
                onClick={() => handleRun(s.config)}
                className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Run
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="px-2 py-1 bg-red-600 text-white rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <hr />

      <h3 className="font-medium">Create New Scenario</h3>
      <div className="space-y-2">
        <input
          placeholder="Scenario Name"
          className="border px-2 py-1 rounded w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          rows={6}
          placeholder='Config JSON, e.g. {"symbols":["AAPL"],"start_date":"2021-01-01",...}'
          className="border px-2 py-1 rounded w-full font-mono text-sm"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
        />
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-yellow-600 text-white rounded"
        >
          Save Scenario
        </button>
      </div>
    </div>
  );
}
