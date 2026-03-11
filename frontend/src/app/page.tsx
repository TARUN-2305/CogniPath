'use client';
import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Layers, LineChart, Cpu, FileCheck, BookOpen } from 'lucide-react';
import { CognitiveMap } from '../components/flow/CognitiveMap';
import { SPCChart } from '../components/iem/SPCChart';
import { FMEADataGrid, FMEAError } from '../components/iem/FMEADataGrid';
import SyllabusDropzone from '../components/teacher/SyllabusDropzone';
import TestBuilderForm from '../components/teacher/TestBuilderForm';

// Mock fetching the backend data
const fetchSPC = async () => {
  // We mock the response from /api/iem/spc for Phase 3 UI testing
  return {
    x_double_bar: 85.2,
    r_bar: 8.4,
    x_bar_chart: {
      center_line: 85.2,
      UCL: 90.0,
      LCL: 80.3,
      data_points: [82.1, 86.4, 88.2, 81.5, 91.0, 85.0, 83.2, 87.1, 80.0, 88.5] // Note subgroup 5 is out of control
    }
  };
};

const fetchFMEA = async (): Promise<FMEAError[]> => {
  return [
    { error_type: 'logical_jump', severity: 9, occurrence: 4, detection: 7, rpn: 252 },
    { error_type: 'calculation_error', severity: 8, occurrence: 8, detection: 2, rpn: 128 },
    { error_type: 'missing_step', severity: 7, occurrence: 5, detection: 4, rpn: 140 },
    { error_type: 'hallucinated_variable', severity: 10, occurrence: 1, detection: 8, rpn: 80 },
    { error_type: 'minor_typo', severity: 1, occurrence: 10, detection: 3, rpn: 30 }
  ].sort((a, b) => b.rpn - a.rpn);
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'individual' | 'iem' | 'teacher'>('teacher');
  const [spcData, setSpcData] = useState<any>(null);
  const [fmeaData, setFmeaData] = useState<FMEAError[]>([]);

  // States for the new Biology CSV demonstration
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('STD-4092');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const studentsList = uploadSuccess
    ? ['BIO-001', 'BIO-002', 'BIO-003', 'BIO-004', 'BIO-005']
    : ['STD-4092'];

  useEffect(() => {
    fetchSPC().then(setSpcData);
    fetchFMEA().then(setFmeaData);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate Multi-Agent Pipeline processing time
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
        setSelectedStudent('BIO-001'); // Auto-select the first student
        setActiveTab('individual'); // Auto-switch to individual tab to view results
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Cpu className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">CogniPath</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">XAI Grading System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('individual')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'individual' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Layers className="w-5 h-5" />
            Individual Analysis
          </button>
          <button
            onClick={() => setActiveTab('iem')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'iem' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LineChart className="w-5 h-5" />
            Class-Wide IEM Analytics
          </button>
          <button
            onClick={() => setActiveTab('teacher')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'teacher' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BookOpen className="w-5 h-5" />
            Teacher Tools
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">
            {activeTab === 'individual' ? 'Student Cognitive Map' : activeTab === 'iem' ? 'Quality Assurance Analytics' : 'Pre-Evaluation Tools'}
          </h2>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${isUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                Evaluating Batch...
              </>
            ) : uploadSuccess ? (
              <>
                <FileCheck className="w-4 h-4" />
                Processed (5) Answers
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload Student Answers CSV
              </>
            )}
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {activeTab === 'teacher' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <SyllabusDropzone />
              <TestBuilderForm />
            </div>
          )}

          {activeTab === 'individual' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                <FileCheck className="w-6 h-6 text-indigo-500 mt-1" />
                <div>
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-gray-900">
                      Student ID:
                    </h3>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {studentsList.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedStudent === 'BIO-003'
                      ? 'The student incorrectly identified the mitochondria as the site of photosynthesis (instead of the chloroplasts) and hallucinated that carbon dioxide is released rather than absorbed. The Evaluator Agent applied a critical semantic penalty.'
                      : selectedStudent.startsWith('BIO')
                        ? 'The student correctly identified the core components of photosynthesis including chloroplasts as the location. Maximum conceptual understanding points awarded.'
                        : 'Ground truth required conservation of energy. The student started correctly but then shifted to an invalid kinematic approach, resulting in an carried-forward math error.'}
                  </p>
                </div>
              </div>

              <CognitiveMap studentId={selectedStudent} />
            </div>
          )}

          {activeTab === 'iem' && spcData && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-indigo-500" />
                    Statistical Process Control
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Displays the Variance over 5 AI evaluations per paper across the latest 10 submissions. Subgroup 5 breaches the Upper Control Limit (UCL), indicating hallucination instability requiring attention.
                  </p>
                  <SPCChart
                    title="X-bar Control Chart"
                    dataPoints={spcData.x_bar_chart.data_points}
                    centerLine={spcData.x_bar_chart.center_line}
                    ucl={spcData.x_bar_chart.UCL}
                    lcl={spcData.x_bar_chart.LCL}
                  />
                </div>

                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 flex flex-col justify-center items-center text-center">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Cpu className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">MSA Reliability</h4>
                  <div className="text-5xl font-extrabold text-indigo-600 mt-2 mb-2">0.84 <span className="text-lg text-gray-500 font-medium tracking-normal">κ</span></div>
                  <p className="text-sm text-gray-600">Cohen's Kappa score indicates <strong>Almost Perfect Agreement</strong> between the AI grader and human baseline.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <FMEADataGrid data={fmeaData} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
