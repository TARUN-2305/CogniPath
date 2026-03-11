'use client';

import { useState, useCallback } from 'react';

export default function SyllabusDropzone() {
    const [isHovering, setIsHovering] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isIngesting, setIsIngesting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleUpload = async () => {
        if (!file) return;

        setIsIngesting(true);
        setStatusMessage("Extracting Triplets & Embedding Knowledge Graph...");

        // Simulate the time taken to process the syllabus via sentence-transformers
        setTimeout(async () => {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('http://localhost:8000/api/teacher/ingest_syllabus', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                if (response.ok) {
                    setStatusMessage(`✅ Success: ${data.message}`);
                } else {
                    setStatusMessage(`❌ Error: ${data.detail || 'Upload failed'}`);
                }
            } catch (err) {
                setStatusMessage('❌ Network Error: Could not reach the FastAPI backend.');
            } finally {
                setIsIngesting(false);
            }
        }, 2500); // Artificial delay to show processing state
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Curriculum Ingestion</h3>
            <p className="text-sm text-slate-500 mb-4">Upload a syllabus or curriculum text to populate the Cognitive Knowledge Graph.</p>

            <div
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                onDragLeave={() => setIsHovering(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isHovering ? 'border-primary-500 bg-primary-50' : 'border-slate-300 bg-slate-50'
                    }`}
            >
                {!file ? (
                    <div>
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm font-medium text-slate-600">Drag & Drop Syllabus PDF/TXT</p>
                        <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                        <input
                            type="file"
                            className="hidden"
                            id="syllabus-upload"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <label htmlFor="syllabus-upload" className="mt-4 inline-block px-4 py-2 bg-slate-800 text-white text-sm rounded cursor-pointer hover:bg-slate-700">
                            Select File
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="text-4xl mb-2">📑</div>
                        <p className="text-sm font-medium text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500 mb-4">{(file.size / 1024).toFixed(1)} KB</p>

                        {!isIngesting && !statusMessage?.includes('Success') && (
                            <button
                                onClick={handleUpload}
                                className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                            >
                                Ingest to Knowledge Graph
                            </button>
                        )}

                        {isIngesting && (
                            <div className="flex flex-col items-center mt-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                <p className="text-sm text-blue-600 font-medium">{statusMessage}</p>
                            </div>
                        )}

                        {!isIngesting && statusMessage && (
                            <div className={`mt-4 p-3 rounded text-sm font-medium ${statusMessage.includes('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {statusMessage}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
