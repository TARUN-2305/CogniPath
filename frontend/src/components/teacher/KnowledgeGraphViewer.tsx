'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { Controls, Background, MiniMap, useNodesState, useEdgesState, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

interface KGNodeData {
    label: string;
    description: string;
    node_type: string;
}

const ConceptNode = ({ data }: { data: KGNodeData }) => (
    <div className={`px-3 py-2 rounded-lg border-2 text-xs max-w-[160px] shadow-sm text-center
    ${data.node_type === 'concept' ? 'bg-sky-50 border-sky-400 text-sky-800' : 'bg-purple-50 border-purple-400 text-purple-800'}`}>
        <div className="font-semibold leading-snug">{data.label}</div>
        {data.description && data.description !== data.label && (
            <div className="text-[10px] text-gray-500 mt-1 leading-tight line-clamp-2">{data.description}</div>
        )}
    </div>
);

const nodeTypes = { conceptNode: ConceptNode };

export default function KnowledgeGraphViewer() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nodeCount, setNodeCount] = useState(0);

    useEffect(() => {
        fetch('http://localhost:8000/api/teacher/kg_nodes')
            .then(r => r.json())
            .then(data => {
                const kgNodes: Node[] = (data.nodes || []).map((n: any, i: number) => ({
                    id: n.node_id,
                    type: 'conceptNode',
                    position: {
                        x: (i % 5) * 220 + 40,
                        y: Math.floor(i / 5) * 130 + 40,
                    },
                    data: { label: n.label, description: n.description, node_type: n.node_type },
                }));

                // Add sequential edges between consecutive concept nodes
                const kgEdges: Edge[] = kgNodes.slice(0, -1).map((n, i) => ({
                    id: `e-${i}-${i + 1}`,
                    source: kgNodes[i].id,
                    target: kgNodes[i + 1].id,
                    animated: true,
                    style: { stroke: '#7dd3fc', strokeWidth: 1.5 },
                }));

                setNodes(kgNodes);
                setEdges(kgEdges);
                setNodeCount(kgNodes.length);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            <div className="animate-spin h-5 w-5 border-2 border-sky-500 rounded-full border-t-transparent mr-2" />
            Loading Knowledge Graph...
        </div>
    );

    if (nodes.length === 0) return (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400 italic">
            No Knowledge Graph data found. Upload a syllabus to populate it.
        </div>
    );

    return (
        <div>
            <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-200 rounded-full text-xs font-semibold text-sky-700">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    {nodeCount} Concept Nodes
                </span>
                <span className="text-xs text-gray-400">Extracted from ingested syllabus</span>
            </div>
            <div className="w-full h-[480px] rounded-xl border border-sky-100 bg-sky-50/30 overflow-hidden shadow-inner">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.2}
                >
                    <Controls />
                    <MiniMap nodeColor="#7dd3fc" nodeStrokeColor="#0ea5e9" />
                    <Background color="#bae6fd" gap={16} />
                </ReactFlow>
            </div>
        </div>
    );
}
