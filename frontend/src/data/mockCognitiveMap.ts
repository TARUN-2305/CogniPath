import { Node, Edge } from 'reactflow';

// 1. Define the custom data interface for your nodes
export interface ReasoningNodeData {
    stepNumber: string;
    type: 'recognition' | 'application' | 'calculation' | 'conclusion';
    text: string;
    confidence: number;
    status: 'valid' | 'warning' | 'invalid';
    errorType: string | null;
    bluffScore: number;
}

// 2. The Nodes Array
export const initialNodes: Node<ReasoningNodeData>[] = [
    {
        id: 'step-1',
        type: 'customReasoningNode', // Maps to your custom React Flow node component
        position: { x: 0, y: 0 },    // Dagre will overwrite these coordinates dynamically
        data: {
            stepNumber: '1',
            type: 'recognition',
            text: 'Recognizes this is a free fall problem under gravity.',
            confidence: 0.98,
            status: 'valid',
            errorType: null,
            bluffScore: 0.02,
        },
    },
    {
        id: 'step-2a',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '2a',
            type: 'application',
            text: 'Applies conservation of energy: mgh = 1/2 mv²',
            confidence: 0.95,
            status: 'valid',
            errorType: null,
            bluffScore: 0.05,
        },
    },
    {
        id: 'step-2b',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '2b',
            type: 'application',
            text: 'Clearly, we just use velocity = distance / time.',
            confidence: 0.99, // High linguistic confidence
            status: 'invalid',
            errorType: 'Conceptual Error',
            bluffScore: 0.88, // High bluff score (confident but conceptually wrong because time is unknown)
        },
    },
    {
        id: 'step-3a',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '3a',
            type: 'calculation',
            text: 'Isolates v and substitutes: v = sqrt(2 * 9.8 * 10)',
            confidence: 0.92,
            status: 'valid',
            errorType: null,
            bluffScore: 0.01,
        },
    },
    {
        id: 'step-4a',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '4a',
            type: 'calculation',
            text: 'Calculates sqrt(196) = 16',
            confidence: 0.90,
            status: 'invalid', // Math error
            errorType: 'Calculation Error',
            bluffScore: 0.10, // Low bluff, just an honest arithmetic mistake
        },
    },
    {
        id: 'step-5a',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '5a',
            type: 'conclusion',
            text: 'Final Answer: 16 m/s',
            confidence: 0.90,
            status: 'warning', // Warning because the logic trajectory was good, giving partial credit
            errorType: 'Carried Forward Error',
            bluffScore: 0.05,
        },
    }
];

// 3. The Edges Array
export const initialEdges: Edge[] = [
    {
        id: 'e1-2a',
        source: 'step-1',
        target: 'step-2a',
        animated: true,
        style: { stroke: '#22c55e', strokeWidth: 2 }, // Tailwind green-500
    },
    {
        id: 'e1-2b',
        source: 'step-1',
        target: 'step-2b',
        animated: false,
        style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, // Tailwind red-500, dashed for bluff path
    },
    {
        id: 'e2a-3a',
        source: 'step-2a',
        target: 'step-3a',
        animated: true,
        style: { stroke: '#22c55e', strokeWidth: 2 },
    },
    {
        id: 'e3a-4a',
        source: 'step-3a',
        target: 'step-4a',
        animated: false,
        style: { stroke: '#eab308', strokeWidth: 2 }, // Tailwind yellow-500 for the transition into an error
    },
    {
        id: 'e4a-5a',
        source: 'step-4a',
        target: 'step-5a',
        animated: false,
        style: { stroke: '#eab308', strokeWidth: 2 },
    }
];
