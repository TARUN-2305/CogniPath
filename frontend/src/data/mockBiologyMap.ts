import { Node, Edge } from 'reactflow';
import { ReasoningNodeData } from './mockCognitiveMap';

// 2. The Biology Nodes Array
export const biologyNodes: Node<ReasoningNodeData>[] = [
    {
        id: 'bio-1',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '1',
            type: 'recognition',
            text: 'It happens in the mitochondria.',
            confidence: 0.98,
            status: 'invalid', // Major semantic error
            errorType: 'Concept Hallucination',
            bluffScore: 0.65,
        },
    },
    {
        id: 'bio-2a',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '2a',
            type: 'application',
            text: 'The plant uses sunlight to turn water into energy.',
            confidence: 0.95,
            status: 'warning', // Incomplete
            errorType: 'Missing Preconditions (CO2, Chlorophyll)',
            bluffScore: 0.35,
        },
    },
    {
        id: 'bio-3a',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '3a',
            type: 'conclusion',
            text: 'It releases carbon dioxide.',
            confidence: 0.99,
            status: 'invalid',
            errorType: 'Scientific Contradiction',
            bluffScore: 0.88,
        },
    }
];

// 3. The Edges Array
export const biologyEdges: Edge[] = [
    {
        id: 'e1-2a',
        source: 'bio-1',
        target: 'bio-2a',
        animated: false,
        style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, // Tailwind red-500
    },
    {
        id: 'e2a-3a',
        source: 'bio-2a',
        target: 'bio-3a',
        animated: false,
        style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, // Tailwind red-500
    }
];

export const biologyNodes_Perfect: Node<ReasoningNodeData>[] = [
    {
        id: 'bio-p1',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '1',
            type: 'recognition',
            text: 'Chloroplasts absorb sunlight using chlorophyll.',
            confidence: 0.99,
            status: 'valid',
            errorType: null,
            bluffScore: 0.05,
        },
    },
    {
        id: 'bio-p2',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '2a',
            type: 'application',
            text: 'Carbon dioxide and water are converted into glucose.',
            confidence: 0.97,
            status: 'valid',
            errorType: null,
            bluffScore: 0.02,
        },
    },
    {
        id: 'bio-p3',
        type: 'customReasoningNode',
        position: { x: 0, y: 0 },
        data: {
            stepNumber: '3a',
            type: 'conclusion',
            text: 'Oxygen is released as a byproduct.',
            confidence: 0.98,
            status: 'valid',
            errorType: null,
            bluffScore: 0.01,
        },
    }
];

export const biologyEdges_Perfect: Edge[] = [
    {
        id: 'e1-2a',
        source: 'bio-p1',
        target: 'bio-p2',
        animated: true,
        style: { stroke: '#22c55e', strokeWidth: 2 },
    },
    {
        id: 'e2a-3a',
        source: 'bio-p2',
        target: 'bio-p3',
        animated: true,
        style: { stroke: '#22c55e', strokeWidth: 2 },
    }
];
