import React, { useState } from 'react';
import axios from 'axios';

export interface Edge { source: string; target: string; }
export interface CausalDiscoverFormProps {
  onSuccess: (edges: Edge[]) => void;
}

export default function CausalDiscoverForm({ onSuccess }: CausalDiscoverFormProps) {
  const [symbols, setSymbols] = useState('AAPL,MSFT');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2022-12-31');
  const [alpha, setAlpha] = useState(0.05);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await axios.post('http://localhost:8000/causal/discover', {
        symbols: symList,
        start_date: startDate,
        end_date: endDate,
        alpha
      });
      onSuccess(res.data.edges);
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
      {/* existing form fields here... */}
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Discover & Visualize</button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}