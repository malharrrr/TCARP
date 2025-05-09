import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const API_BASE = 'http://localhost:8000';

interface PerDecisionExplainItem {
  date: string;
  action: string;
  contributions: Record<string, number>;
}
interface PerDecisionExplainResponse {
  explains: PerDecisionExplainItem[];
}
interface GlobalExplainResponse {
  importance: Record<string, number>;
}

export default function ExplainabilityTabs() {
  const [modelId, setModelId] = useState('');
  const [symbolsCsv, setSymbolsCsv] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [perData, setPerData] = useState<PerDecisionExplainItem[] | null>(null);
  const [globalData, setGlobalData] = useState<{ name: string; value: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runExplain = async () => {
    setError(null);
    setPerData(null);
    setGlobalData(null);
    if (!modelId || !symbolsCsv || !startDate || !endDate) {
      setError('All fields are required');
      return;
    }
    const symbols = symbolsCsv.split(',').map(s => s.trim());
    const payload = { model_id: modelId, symbols, start_date: startDate, end_date: endDate };

    setLoading(true);
    try {
      // Global
      const gRes = await fetch('http://localhost:8000/explain/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!gRes.ok) throw new Error(await gRes.text());
      const gJson: GlobalExplainResponse = await gRes.json();
      const gArr = Object.entries(gJson.importance)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setGlobalData(gArr);

      // Per‑decision
      const pRes = await fetch('http://localhost:8000/explain/perdecision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!pRes.ok) throw new Error(await pRes.text());
      const pJson: PerDecisionExplainResponse = await pRes.json();
      setPerData(pJson.explains);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Color scale: negative = blue, positive = red
  const cellColor = (v: number) => {
    const max =  Math.max(...(perData?.flatMap(d => Object.values(d.contributions)) || [1]));
    const min =  Math.min(...(perData?.flatMap(d => Object.values(d.contributions)) || [-1]));
    // normalize to [-1,1]:
    const norm = v > 0 ? v / max : (v < 0 ? v / -min : 0);
    const red = norm > 0 ? Math.round(255 * norm) : 0;
    const blue = norm < 0 ? Math.round(255 * (-norm)) : 0;
    return `rgba(${red},0,${blue},0.6)`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Explainability</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Model ID:</label>
          <input
            className="w-full p-1 border"
            value={modelId}
            onChange={e => setModelId(e.target.value)}
            placeholder="uuid..."
          />
        </div>
        <div>
          <label>Symbols (comma‑sep):</label>
          <input
            className="w-full p-1 border"
            value={symbolsCsv}
            onChange={e => setSymbolsCsv(e.target.value)}
            placeholder="AAPL,MSFT,GOOG"
          />
        </div>
        <div>
          <label>Start Date:</label>
          <input
            type="date"
            className="w-full p-1 border"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label>End Date:</label>
          <input
            type="date"
            className="w-full p-1 border"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <button
        className="px-4 py-2 bg-indigo-600 text-white rounded"
        onClick={runExplain}
        disabled={loading}
      >
        {loading ? 'Running…' : 'Run Explainability'}
      </button>

      {error && <div className="text-red-600">{error}</div>}

      {/* Global Importance Bar Chart */}
      {globalData && (
        <div>
          <h3 className="mt-6 font-semibold">Global Feature Importances</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={globalData} layout="vertical" margin={{ left: 50 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per‑Decision Heatmap */}
      {perData && (
        <div className="overflow-auto mt-6">
          <h3 className="font-semibold">Per‑Decision SHAP Heatmap</h3>
          <table className="table-auto border-collapse">
            <thead>
              <tr>
                <th className="p-1 border">Date</th>
                {symbolsCsv.split(',').map(sym => (
                  <th key={sym} className="p-1 border">{sym.trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perData.map(row => (
                <tr key={row.date}>
                  <td className="p-1 border">{row.date}</td>
                  {symbolsCsv.split(',').map(sym => {
                    const v = row.contributions[sym.trim()] || 0;
                    return (
                      <td
                        key={sym}
                        className="p-1 border text-xs"
                        style={{ backgroundColor: cellColor(v) }}
                        title={v.toFixed(4)}
                      >
                        {v.toFixed(3)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
