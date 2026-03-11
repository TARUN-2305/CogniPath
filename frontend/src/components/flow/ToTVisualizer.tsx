'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    ThoughtTree,
    ThoughtNodeData,
    biologyThoughtTree_BIO003,
    biologyThoughtTree_Perfect,
} from '@/data/mockThoughtTree';

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLOR = {
    valid: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    warning: { bg: '#fefce8', border: '#eab308', text: '#713f12' },
    invalid: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    gray: { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
    selected: { ring: '#6366f1' },
};

const STEP_ICONS: Record<string, string> = {
    recognition: '🔍',
    application: '⚡',
    calculation: '🧮',
    inference: '💡',
    verification: '✅',
    conclusion: '🏁',
    unknown: '•',
};

// ─── Custom Node ─────────────────────────────────────────────────────────────
function ToTNode({ data, selected }: { data: any; selected: boolean }) {
    const node: ThoughtNodeData = data.node;
    const onClick: () => void = data.onNodeClick;

    let colors = COLOR.gray;
    if (node.is_selected) {
        if (node.is_validated === true) colors = COLOR.valid;
        else if (node.is_validated === false) colors = node.bluff_score > 0.6 ? COLOR.invalid : COLOR.warning;
    }

    const preview = node.text.split(' ').slice(0, 6).join(' ') + (node.text.split(' ').length > 6 ? '…' : '');

    return (
        <div
            onClick={onClick}
            className="cursor-pointer rounded-xl px-3 py-2 text-center"
            style={{
                background: colors.bg,
                border: `2px ${node.is_selected ? 'solid' : 'dashed'} ${colors.border}`,
                color: colors.text,
                minWidth: 130,
                maxWidth: 170,
                boxShadow: node.is_selected ? `0 0 0 ${selected ? 3 : 0}px ${COLOR.selected.ring}` : 'none',
            }}
        >
            <div className="text-xs font-bold mb-0.5" style={{ color: colors.text }}>
                {STEP_ICONS[node.type] || '•'} Step {node.step_num}
            </div>
            <div className="text-[10px] leading-tight font-medium">{preview}</div>
            {node.bluff_score > 0.3 && (
                <span className="mt-1 inline-block px-1 py-0.5 bg-red-100 text-red-700 text-[9px] rounded font-semibold">
                    bluff {node.bluff_score.toFixed(2)}
                </span>
            )}
            {!node.is_selected && (
                <div className="text-[9px] mt-0.5 text-slate-400 italic">alt. path</div>
            )}
        </div>
    );
}

const nodeTypes = { totNode: ToTNode };

// ─── Layout (simple tree layout) ─────────────────────────────────────────────
function layoutTree(tree: ThoughtTree, onNodeClick: (n: ThoughtNodeData) => void) {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const visited = new Set<string>();

    // BFS to determine levels
    const levels: Record<string, number> = {};
    const order: string[] = [];
    const queue = [tree.root_id];
    levels[tree.root_id] = 0;

    while (queue.length) {
        const nid = queue.shift()!;
        if (visited.has(nid)) continue;
        visited.add(nid);
        order.push(nid);
        const n = tree.nodes[nid];
        if (!n) continue;
        for (const child of n.children) {
            if (!visited.has(child)) {
                levels[child] = (levels[nid] ?? 0) + 1;
                queue.push(child);
            }
        }
    }

    // Count nodes per level for horizontal placement
    const levelCounts: Record<number, number> = {};
    const levelCounters: Record<number, number> = {};
    for (const nid of order) {
        const lv = levels[nid] ?? 0;
        levelCounts[lv] = (levelCounts[lv] || 0) + 1;
        levelCounters[lv] = 0;
    }

    for (const nid of order) {
        const n = tree.nodes[nid];
        if (!n) continue;
        const lv = levels[nid] ?? 0;
        const idx = levelCounters[lv]++;
        const total = levelCounts[lv];
        const x = (idx - (total - 1) / 2) * 220;
        const y = lv * 160;

        nodes.push({
            id: nid,
            type: 'totNode',
            position: { x, y },
            data: { node: n, onNodeClick: () => onNodeClick(n) },
        });

        for (const child of n.children) {
            const isSelectedEdge =
                tree.best_path_ids.includes(nid) && tree.best_path_ids.includes(child);
            edges.push({
                id: `${nid}-${child}`,
                source: nid,
                target: child,
                animated: isSelectedEdge,
                style: {
                    stroke: isSelectedEdge ? '#6366f1' : '#94a3b8',
                    strokeWidth: isSelectedEdge ? 2.5 : 1.2,
                    strokeDasharray: isSelectedEdge ? undefined : '5,4',
                },
            });
        }
    }

    return { nodes, edges };
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ToTVisualizerProps {
    studentId: string;
}

export function ToTVisualizer({ studentId }: ToTVisualizerProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [showFullTree, setShowFullTree] = useState(true);
    const [selectedNode, setSelectedNode] = useState<ThoughtNodeData | null>(null);

    const tree: ThoughtTree =
        studentId === 'BIO-003'
            ? biologyThoughtTree_BIO003
            : biologyThoughtTree_Perfect;

    const handleNodeClick = useCallback((n: ThoughtNodeData) => {
        setSelectedNode(n);
    }, []);

    useEffect(() => {
        setSelectedNode(null);
        let filteredTree = tree;

        if (!showFullTree) {
            // Show only the best path nodes
            const bestIds = new Set(tree.best_path_ids);
            const filteredNodes: typeof tree.nodes = {};
            for (const [id, node] of Object.entries(tree.nodes)) {
                if (bestIds.has(id)) {
                    filteredNodes[id] = { ...node, children: node.children.filter(c => bestIds.has(c)) };
                }
            }
            filteredTree = { ...tree, nodes: filteredNodes };
        }

        const { nodes: n, edges: e } = layoutTree(filteredTree, handleNodeClick);
        setNodes(n);
        setEdges(e);
    }, [studentId, showFullTree, handleNodeClick]);

    const bestStepCount = tree.best_path_ids.length;
    const totalNodeCount = Object.keys(tree.nodes).length;

    return (
        <div className="flex gap-4 h-[540px]">
            {/* Graph */}
            <div className="flex-1 flex flex-col">
                {/* Controls bar */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700">
                            🌳 {totalNodeCount} nodes explored · {bestStepCount} steps selected
                        </span>
                        {studentId === 'BIO-003' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-[10px] font-semibold text-red-700">
                                ⚠️ Bluff Detected
                            </span>
                        )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-slate-500">Best path only</span>
                        <div
                            onClick={() => setShowFullTree(v => !v)}
                            className={`w-9 h-5 rounded-full relative transition-colors ${showFullTree ? 'bg-indigo-500' : 'bg-slate-300'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showFullTree ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs text-slate-500">Full tree</span>
                    </label>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-2 text-[10px] mb-2">
                    {[
                        { color: '#22c55e', label: 'Valid step' },
                        { color: '#ef4444', label: 'Invalid / Hallucination' },
                        { color: '#eab308', label: 'Partial / Warning' },
                        { color: '#94a3b8', label: 'Alternative (not taken)' },
                    ].map(({ color, label }) => (
                        <span key={label} className="flex items-center gap-1 text-slate-500">
                            <span className="inline-block w-3 h-3 rounded border-2" style={{ borderColor: color, backgroundColor: color + '22' }} />
                            {label}
                        </span>
                    ))}
                </div>

                <div className="flex-1 rounded-xl border border-indigo-100 overflow-hidden bg-indigo-50/20 shadow-inner">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        fitView
                        minZoom={0.15}
                    >
                        <Controls />
                        <MiniMap nodeColor="#a5b4fc" nodeStrokeColor="#6366f1" />
                        <Background color="#c7d2fe" gap={18} />
                    </ReactFlow>
                </div>
            </div>

            {/* Side panel */}
            <div className="w-64 flex-shrink-0 border border-slate-200 rounded-xl bg-white overflow-auto shadow-sm">
                {selectedNode ? (
                    <div className="p-4 space-y-3">
                        <button onClick={() => setSelectedNode(null)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                            ← Back
                        </button>
                        <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Step {selectedNode.step_num} · {selectedNode.type}</span>
                            <p className="mt-1 text-sm text-slate-800 font-medium leading-snug">{selectedNode.text}</p>
                        </div>
                        <hr className="border-slate-100" />
                        <div className="space-y-2 text-xs">
                            <Row label="Confidence" value={`${(selectedNode.confidence * 100).toFixed(0)}%`} />
                            <Row label="Path Score" value={selectedNode.path_score.toFixed(2)} />
                            <Row label="Is Selected" value={selectedNode.is_selected ? '✅ Yes' : '⬜ No'} />
                            {selectedNode.is_validated !== undefined && selectedNode.is_validated !== null && (
                                <Row label="Validated" value={selectedNode.is_validated ? '✅ Valid' : '❌ Invalid'} />
                            )}
                            {selectedNode.error_type && (
                                <Row label="Error Type" value={selectedNode.error_type} valueClass="text-red-600 font-semibold" />
                            )}
                            {selectedNode.bluff_score > 0 && (
                                <div>
                                    <div className="flex justify-between mb-0.5">
                                        <span className="text-slate-500">Bluff Score</span>
                                        <span className={selectedNode.bluff_score > 0.5 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                                            {selectedNode.bluff_score.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full"
                                            style={{
                                                width: `${selectedNode.bluff_score * 100}%`,
                                                backgroundColor: selectedNode.bluff_score > 0.6 ? '#ef4444' : selectedNode.bluff_score > 0.3 ? '#eab308' : '#22c55e',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <div className="text-3xl mb-2">🖱️</div>
                        <p className="text-xs">Click any node to inspect its reasoning step details and bluff signals</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Row({ label, value, valueClass = 'text-slate-700' }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-slate-500">{label}</span>
            <span className={`font-medium ${valueClass}`}>{value}</span>
        </div>
    );
}
