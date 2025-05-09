import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface Metric { step: number; reward: number; }

export default function TrainingMetricsChart({ data }: { data: Metric[] }) {
  return (
    <LineChart width={600} height={300} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="step" label={{ value: 'Timesteps', position: 'insideBottomRight', offset: -5 }} />
      <YAxis label={{ value: 'Reward', angle: -90, position: 'insideLeft' }} />
      <Tooltip />
      <Line type="monotone" dataKey="reward" dot={false} />
    </LineChart>
  );
}