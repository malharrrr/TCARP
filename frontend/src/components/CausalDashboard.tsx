import React, { useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';

interface Edge { source: string; target: string; }

export default function CausalDashboard() {
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOG');
  const [startDate, setStartDate] = useState('2021-01-01');
  const [endDate, setEndDate] = useState('2021-12-31');
  const [alpha, setAlpha] = useState(0.05);
  const [graphData, setGraphData] = useState<{
    nodes: { id: string }[];
    links: { source: string; target: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // What‑If state
  const [perturbSymbol, setPerturbSymbol] = useState('AAPL');
  const [perturbValue, setPerturbValue] = useState(0);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGraphData(null);
    const syms = symbols.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const res = await axios.post(
        'http://localhost:8000/causal/discover',
        { symbols: syms, start_date: startDate, end_date: endDate, alpha }
      );
      const nodes = syms.map((id) => ({ id }));
      const links = res.data.edges.map((e: Edge) => ({
        source: e.source,
        target: e.target,
      }));
      setGraphData({ nodes, links });
    } catch (err: any) {
      const d = err.response?.data;
      setError(
        typeof d === 'object' ? d.detail ?? JSON.stringify(d) : d ?? err.message
      );
    }
  };

  const handleWhatIf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!graphData) return;
    setError(null);
    try {
      const syms = symbols.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await axios.post(
        'http://localhost:8000/causal/whatif',
        {
          symbols: syms,
          start_date: startDate,
          end_date: endDate,
          alpha,
          perturb: { [perturbSymbol]: perturbValue },
        }
      );
      const nodes = syms.map((id) => ({ id }));
      const links = res.data.edges.map((e: Edge) => ({
        source: e.source,
        target: e.target,
      }));
      setGraphData({ nodes, links });
    } catch (err: any) {
      const d = err.response?.data;
      setError(
        typeof d === 'object' ? d.detail ?? JSON.stringify(d) : d ?? err.message
      );
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleDiscover} className="space-y-4">
        {/* Symbols */}
        <div>
          <div className="flex items-center space-x-1">
            <label className="font-medium">Symbols (CSV)</label>
            <div className="relative group inline-block">
              <span className="text-gray-500 cursor-pointer">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Comma‑separated tickers for causal discovery.
              </div>
            </div>
          </div>
          <input
            className="mt-1 border px-2 py-1 rounded w-full"
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-1">
              <label className="font-medium">Start Date</label>
              <div className="relative group inline-block">
                <span className="text-gray-500 cursor-pointer">?</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  First date (inclusive) of sample.
                </div>
              </div>
            </div>
            <input
              type="date"
              className="mt-1 border px-2 py-1 rounded w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <label className="font-medium">End Date</label>
              <div className="relative group inline-block">
                <span className="text-gray-500 cursor-pointer">?</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Last date (inclusive) of sample.
                </div>
              </div>
            </div>
            <input
              type="date"
              className="mt-1 border px-2 py-1 rounded w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Alpha slider */}
        <div>
          <div className="flex items-center space-x-1">
            <label className="font-medium">Alpha</label>
            <div className="relative group inline-block">
              <span className="text-gray-500 cursor-pointer">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-52 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                PC algorithm p‑value threshold: lower → fewer edges.
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
            />
            <span className="w-12 text-right">{alpha.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Discover Causal Graph
        </button>
      </form>

      {/* What‑If */}
      {graphData && (
        <form onSubmit={handleWhatIf} className="space-y-4 border-t pt-4">
          <h3 className="font-medium">What‑If Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Symbol to Perturb</label>
              <select
                className="mt-1 border px-2 py-1 rounded w-full"
                value={perturbSymbol}
                onChange={(e) => setPerturbSymbol(e.target.value)}
              >
                {graphData.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium">
                Delta Return (%)
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 border px-2 py-1 rounded w-full"
                value={perturbValue}
                onChange={(e) =>
                  setPerturbValue(parseFloat(e.target.value))
                }
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Apply What‑If
          </button>
        </form>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {graphData && (
        <div className="h-96 border rounded">
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="id"
            nodeAutoColorBy="id"
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            width={window.innerWidth * 0.8}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
