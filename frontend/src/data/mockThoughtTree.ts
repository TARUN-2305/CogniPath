import { Node, Edge } from 'reactflow';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ThoughtNodeData {
    node_id: string;
    step_num: number;
    text: string;
    type: string;
    confidence: number;
    path_score: number;
    is_selected: boolean;
    is_validated?: boolean | null;
    error_type?: string | null;
    bluff_score: number;
    children: string[];
}

export interface ThoughtTree {
    root_id: string;
    nodes: Record<string, ThoughtNodeData>;
    best_path_ids: string[];
}

// ─── Biology BIO-003: Mitochondria hallucination ─────────────────────────────
// Best path (selected = true) mirrors the WRONG reasoning — red nodes
// Alternative branch (selected = false) mirrors the CORRECT one — gray nodes

export const biologyThoughtTree_BIO003: ThoughtTree = {
    root_id: 'n1',
    best_path_ids: ['n1', 'n3', 'n5', 'n7'],
    nodes: {
        n1: {
            node_id: 'n1', step_num: 1,
            text: 'Recognises question is about photosynthesis',
            type: 'recognition', confidence: 0.93, path_score: 0.93,
            is_selected: true, is_validated: true, error_type: null, bluff_score: 0.05,
            children: ['n2', 'n3'],
        },
        // ── Alternative branch (correct) ──────────────────────────────────────
        n2: {
            node_id: 'n2', step_num: 2,
            text: 'Considers chloroplast as the site of photosynthesis',
            type: 'recognition', confidence: 0.88, path_score: 1.81,
            is_selected: false, is_validated: true, error_type: null, bluff_score: 0.04,
            children: ['n4'],
        },
        n4: {
            node_id: 'n4', step_num: 3,
            text: 'CO₂ + H₂O → glucose + O₂ inside chloroplast',
            type: 'application', confidence: 0.91, path_score: 2.72,
            is_selected: false, is_validated: true, error_type: null, bluff_score: 0.03,
            children: [],
        },
        // ── Selected (wrong) branch ───────────────────────────────────────────
        n3: {
            node_id: 'n3', step_num: 2,
            text: 'Assumes mitochondria is the site of photosynthesis',
            type: 'recognition', confidence: 0.75, path_score: 1.68,
            is_selected: true, is_validated: false, error_type: 'Concept Hallucination', bluff_score: 0.65,
            children: ['n5'],
        },
        n5: {
            node_id: 'n5', step_num: 3,
            text: 'Thinks plant releases CO₂ instead of absorbing it',
            type: 'inference', confidence: 0.68, path_score: 2.36,
            is_selected: true, is_validated: false, error_type: 'Scientific Contradiction', bluff_score: 0.88,
            children: ['n7'],
        },
        n7: {
            node_id: 'n7', step_num: 4,
            text: 'Concludes: photosynthesis converts sunlight to energy in mitochondria',
            type: 'conclusion', confidence: 0.80, path_score: 3.16,
            is_selected: true, is_validated: false, error_type: 'Missing Step', bluff_score: 0.72,
            children: [],
        },
    },
};

// ─── Biology BIO-001 / BIO-002 / BIO-004 / BIO-005: Correct reasoning ────────
export const biologyThoughtTree_Perfect: ThoughtTree = {
    root_id: 'p1',
    best_path_ids: ['p1', 'p2', 'p3', 'p4', 'p5'],
    nodes: {
        p1: {
            node_id: 'p1', step_num: 1,
            text: 'Identifies this as a photosynthesis question',
            type: 'recognition', confidence: 0.96, path_score: 0.96,
            is_selected: true, is_validated: true, error_type: null, bluff_score: 0.02,
            children: ['p2', 'pa'],
        },
        pa: {
            node_id: 'pa', step_num: 2,
            text: 'Considers alternative: cellular respiration in mitochondria',
            type: 'recognition', confidence: 0.44, path_score: 1.40,
            is_selected: false, is_validated: true, error_type: null, bluff_score: 0.05,
            children: [],
        },
        p2: {
            node_id: 'p2', step_num: 2,
            text: 'Correctly identifies chloroplast as the reaction site',
            type: 'application', confidence: 0.95, path_score: 1.91,
            is_selected: true, is_validated: true, error_type: null, bluff_score: 0.01,
            children: ['p3'],
        },
        p3: {
            node_id: 'p3', step_num: 3,
            text: 'Recalls chlorophyll absorbs light energy',
            type: 'application', confidence: 0.93, path_score: 2.84,
            is_selected: true, is_validated: true, error_type: null, bluff_score: 0.02,
            children: ['p4'],
        },
        p4: {
            node_id: 'p4', step_num: 4,
            text: 'CO₂ + H₂O are converted to glucose; O₂ released',
            type: 'calculation', confidence: 0.97, path_score: 3.81,
            is_selected: true, is_validated: true, error_type: null, bluff_score: 0.01,
            children: ['p5'],
        },
        p5: {
            node_id: 'p5', step_num: 5,
            text: 'Concludes: photosynthesis occurs in chloroplasts via light-dependent and light-independent reactions',
            type: 'conclusion', confidence: 0.96, path_score: 4.77,
            is_selected: true, is_validated: true, error_type: null, bluff_score: 0.03,
            children: [],
        },
    },
};
