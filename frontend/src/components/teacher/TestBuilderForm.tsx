'use client';

import { useState } from 'react';

export default function TestBuilderForm() {
    const [formData, setFormData] = useState({
        question_id: 'dfa-1',
        question: 'Construct a DFA over the alphabet {0, 1} that accepts the language L = {w | w contains the substring 110}.',
        ground_truth: '4 states: q0 (start), q1 (sees 1), q2 (sees 11), q3 (sees 110, accept). Transitions: d(q0,1)=q1, d(q1,1)=q2, d(q2,0)=q3. Failure: d(q1,0)=q0, d(q2,1)=q2. Accept loop: d(q3,0/1)=q3.',
        expected_format: 'Step-by-step state definition and transition function layout.',
        enable_math_validation: false,
        enable_logic_validation: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('http://localhost:8000/api/teacher/create_test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: `Test Profile Activated: ${formData.question_id}` });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Failed to create test' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network Error: Cannot connect to FastAPI routing layer.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Assessment Builder</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Question ID</label>
                        <input
                            type="text"
                            value={formData.question_id}
                            onChange={(e) => setFormData({ ...formData, question_id: e.target.value })}
                            className="w-full text-black px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expected Format</label>
                        <input
                            type="text"
                            value={formData.expected_format}
                            onChange={(e) => setFormData({ ...formData, expected_format: e.target.value })}
                            className="w-full text-black px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Prompt</label>
                    <textarea
                        rows={3}
                        value={formData.question}
                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                        className="w-full text-black px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ground Truth / Rubric Target</label>
                    <textarea
                        rows={3}
                        value={formData.ground_truth}
                        onChange={(e) => setFormData({ ...formData, ground_truth: e.target.value })}
                        className="w-full text-black px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>

                <div className="flex gap-8 py-3 px-4 bg-slate-50 rounded border border-slate-100">
                    <div className="flex items-center">
                        <div
                            className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${formData.enable_logic_validation ? 'bg-blue-600' : 'bg-slate-300'}`}
                            onClick={() => setFormData({ ...formData, enable_logic_validation: !formData.enable_logic_validation })}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.enable_logic_validation ? 'left-7' : 'left-1'}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-slate-700">DeBERTa Logic Engine</span>
                    </div>

                    <div className="flex items-center">
                        <div
                            className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${formData.enable_math_validation ? 'bg-blue-600' : 'bg-slate-300'}`}
                            onClick={() => setFormData({ ...formData, enable_math_validation: !formData.enable_math_validation })}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.enable_math_validation ? 'left-7' : 'left-1'}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-slate-700">SymPy Math Engine</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    {message ? (
                        <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {message.text}
                        </span>
                    ) : <span />}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 transition flex items-center gap-2"
                    >
                        {isSubmitting ? 'Saving Configuration...' : 'Initialize Test Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
