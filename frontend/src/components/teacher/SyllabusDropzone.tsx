'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const KnowledgeGraphViewer = dynamic(
    () => import('./KnowledgeGraphViewer'),
    { ssr: false }
);

interface UploadStatus {
    type: 'success' | 'error';
    message: string;
    nodeCount?: number;
}

export default function SyllabusDropzone() {
    const [isHovering, setIsHovering] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isIngesting, setIsIngesting] = useState(false);
    const [status, setStatus] = useState<UploadStatus | null>(null);
    const [showKG, setShowKG] = useState(false);
    const [kgKey, setKgKey] = useState(0);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsIngesting(true);
        setStatus(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/api/teacher/ingest_syllabus', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', message: data.message, nodeCount: data.node_count });
            } else {
                setStatus({ type: 'error', message: data.detail || 'Upload failed' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Network Error: Could not reach the FastAPI backend.' });
        } finally {
            setIsIngesting(false);
        }
    };

    const handleViewKG = () => {
        setKgKey(k => k + 1); // force fresh fetch
        setShowKG(true);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Curriculum Ingestion</h3>
            <p className="text-sm text-slate-500 mb-4">
                Upload a syllabus text/PDF to populate the Knowledge Graph.
            </p>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                onDragLeave={() => setIsHovering(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isHovering ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
            >
                {!file ? (
                    <div>
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm font-medium text-slate-600">Drag & Drop Syllabus PDF/TXT</p>
                        <input type="file" id="syllabus-upload" className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        <label htmlFor="syllabus-upload"
                            className="mt-4 inline-block px-4 py-2 bg-slate-800 text-white text-sm rounded cursor-pointer hover:bg-slate-700">
                            Select File
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-4xl">📑</div>
                        <p className="text-sm font-medium text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>

                        {!isIngesting && !status && (
                            <button onClick={handleUpload}
                                className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">
                                Ingest to Knowledge Graph
                            </button>
                        )}

                        {isIngesting && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                <p className="text-sm text-blue-600 font-medium">Extracting Triplets & Embedding...</p>
                            </div>
                        )}

                        {status && (
                            <div className={`w-full p-3 rounded text-sm font-medium text-center
                ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {status.message}
                            </div>
                        )}

                        {status?.type === 'success' && (
                            <button
                                onClick={handleViewKG}
                                className="flex items-center gap-2 px-5 py-2 bg-sky-600 text-white text-sm rounded shadow hover:bg-sky-700 transition"
                            >
                                🔭 View Knowledge Graph ({status.nodeCount} nodes)
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* KG Viewer */}
            {showKG && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">
                            Knowledge Graph — {file?.name}
                        </h4>
                        <button onClick={() => setShowKG(false)} className="text-xs text-slate-400 hover:text-slate-600">
                            ✕ Close
                        </button>
                    </div>
                    <KnowledgeGraphViewer key={kgKey} />
                </div>
            )}
        </div>
    );
}
