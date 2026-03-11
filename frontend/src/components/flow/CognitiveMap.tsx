'use client';

import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomReasoningNode from './CustomReasoningNode';
import { initialNodes, initialEdges } from '../../data/mockCognitiveMap';
import { getLayoutedElements } from '../../lib/dagreLayout';
import { biologyNodes, biologyEdges, biologyNodes_Perfect, biologyEdges_Perfect } from '../../data/mockBiologyMap';

const nodeTypes = {
    customReasoningNode: CustomReasoningNode,
};

export const CognitiveMap = ({ studentId = 'STD-4092' }: { studentId?: string }) => {
    // Determine which graph to render
    let sourceNodes = initialNodes;
    let sourceEdges = initialEdges;

    if (studentId === 'BIO-003') {
        sourceNodes = biologyNodes;
        sourceEdges = biologyEdges;
    } else if (studentId.startsWith('BIO')) {
        sourceNodes = biologyNodes_Perfect;
        sourceEdges = biologyEdges_Perfect;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        sourceNodes,
        sourceEdges
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    // Update state to use new graph topology when the prop changes
    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
            sourceNodes,
            sourceEdges
        );
        setNodes(newNodes);
        setEdges(newEdges);
    }, [studentId, sourceNodes, sourceEdges, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div className="w-full h-[600px] border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-50/50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.2}
                className="bg-teal-50/20"
            >
                <Controls />
                <MiniMap nodeStrokeColor="#4b5563" nodeColor="#f3f4f6" />
                <Background color="#9ca3af" gap={16} />
            </ReactFlow>
        </div>
    );
};
