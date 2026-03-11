'use client';

import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Question {
    question_id: string;
    question: string;
    ground_truth: string;
    expected_format: string;
    enable_math_validation: boolean;
    enable_logic_validation: boolean;
}

const emptyQuestion = (): Question => ({
    question_id: '',
    question: '',
    ground_truth: '',
    expected_format: 'Step-by-step explanation',
    enable_math_validation: false,
    enable_logic_validation: true,
});

export default function TestBuilderForm() {
    const [testId, setTestId] = useState('');
    const [subject, setSubject] = useState('');
    const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const updateQuestion = (index: number, key: keyof Question, value: any) => {
        setQuestions(qs => qs.map((q, i) => i === index ? { ...q, [key]: value } : q));
    };

    const addQuestion = () => setQuestions(qs => [...qs, emptyQuestion()]);

    const removeQuestion = (index: number) => {
        if (questions.length === 1) return;
        setQuestions(qs => qs.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        const payload = { test_id: testId, subject, questions };

        try {
            const res = await fetch('http://localhost:8000/api/teacher/create_test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `✅ Test '${testId}' saved with ${questions.length} question(s).` });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Failed to save test.' });
            }
        } catch {
            setMessage({ type: 'error', text: '❌ Network Error: Cannot connect to FastAPI backend.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
        <button type="button" onClick={onToggle}
            className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0
        ${on ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
        ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">Assessment Builder</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Test metadata */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Test ID</label>
                        <input value={testId} onChange={e => setTestId(e.target.value)} required
                            placeholder="e.g. biology-unit2"
                            className="w-full text-black px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subject</label>
                        <input value={subject} onChange={e => setSubject(e.target.value)} required
                            placeholder="e.g. Biology"
                            className="w-full text-black px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                {/* Questions list */}
                <div className="space-y-5">
                    {questions.map((q, i) => (
                        <div key={i} className="relative border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                            {/* Question header */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Question {i + 1}
                                </span>
                                {questions.length > 1 && (
                                    <button type="button" onClick={() => removeQuestion(i)}
                                        className="text-red-400 hover:text-red-600 transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                <input
                                    value={q.question_id}
                                    onChange={e => updateQuestion(i, 'question_id', e.target.value)}
                                    placeholder="Question ID (e.g. photo-1)"
                                    required
                                    className="w-full text-black px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <textarea
                                    rows={2}
                                    value={q.question}
                                    onChange={e => updateQuestion(i, 'question', e.target.value)}
                                    placeholder="Question prompt..."
                                    required
                                    className="w-full text-black px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                                <textarea
                                    rows={2}
                                    value={q.ground_truth}
                                    onChange={e => updateQuestion(i, 'ground_truth', e.target.value)}
                                    placeholder="Ground truth / Rubric target..."
                                    required
                                    className="w-full text-black px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                                <input
                                    value={q.expected_format}
                                    onChange={e => updateQuestion(i, 'expected_format', e.target.value)}
                                    placeholder="Expected answer format"
                                    className="w-full text-black px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />

                                {/* AI Engine Toggles */}
                                <div className="flex items-center gap-6 pt-1">
                                    <div className="flex items-center gap-2">
                                        <Toggle on={q.enable_logic_validation}
                                            onToggle={() => updateQuestion(i, 'enable_logic_validation', !q.enable_logic_validation)} />
                                        <span className="text-xs font-medium text-slate-700">DeBERTa Logic Engine</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Toggle on={q.enable_math_validation}
                                            onToggle={() => updateQuestion(i, 'enable_math_validation', !q.enable_math_validation)} />
                                        <span className="text-xs font-medium text-slate-700">SymPy Math Engine</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Question Button */}
                <button type="button" onClick={addQuestion}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition">
                    <Plus className="w-4 h-4" />
                    Add Another Question
                </button>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2">
                    {message ? (
                        <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {message.text}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">
                            {questions.length} question{questions.length > 1 ? 's' : ''} · CSV format: <code className="bg-slate-100 px-1 rounded">student_id,question_id,answer</code>
                        </span>
                    )}
                    <button type="submit" disabled={isSubmitting}
                        className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 transition text-sm">
                        {isSubmitting ? 'Saving...' : 'Save Test Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
