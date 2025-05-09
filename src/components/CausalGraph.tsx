import React, { useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import CausalDiscoverForm from './CausalDiscoverForm';

interface Edge { source: string; target: string; }

export default function CausalGraph() {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = (edges: Edge[]) => {
    const nodesSet = new Set<string>();
    edges.forEach(e => { nodesSet.add(e.source); nodesSet.add(e.target); });
    const nodes = Array.from(nodesSet).map(id => ({ id }));
    const links = edges.map(e => ({ source: e.source, target: e.target }));
    setGraphData({ nodes, links });
  };

  return (
    <div>
      <CausalDiscoverForm onSuccess={handleDiscover} />
      {error && <p className="text-red-500">{error}</p>}
      {graphData && (
        <div style={{ height: '600px', border: '1px solid #ccc', marginTop: '16px' }}>
          <ForceGraph2D
            graphData={graphData}
            nodeAutoColorBy="id"
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
          />
        </div>
      )}
    </div>
  );
}