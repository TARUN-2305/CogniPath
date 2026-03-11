'use client';
import React from 'react';

export interface FMEAError {
    error_type: string;
    severity: number;
    occurrence: number;
    detection: number;
    rpn: number;
}

interface FMEADataGridProps {
    data: FMEAError[];
}

export const FMEADataGrid: React.FC<FMEADataGridProps> = ({ data }) => {
    return (
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">FMEA Risk Analysis (Sorted by RPN)</h3>
                <p className="text-sm text-gray-500">Detection logic is inverted: 10 = impossible for AI to catch, 1 = trivially caught.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3">Error Type</th>
                            <th scope="col" className="px-6 py-3 text-center">Severity (1-10)</th>
                            <th scope="col" className="px-6 py-3 text-center">Occurrence (1-10)</th>
                            <th scope="col" className="px-6 py-3 text-center">Detection (1-10)</th>
                            <th scope="col" className="px-6 py-3 text-center font-bold text-gray-900">RPN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => {
                            // Conditionally format rows with RPN > 100
                            const isHighRisk = row.rpn > 100;
                            return (
                                <tr key={idx} className={`border-b ${isHighRisk ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4 font-medium whitespace-nowrap capitalize">
                                        {row.error_type.replace(/_/g, ' ')}
                                        {isHighRisk && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">High Risk</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-600">{row.severity}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{row.occurrence}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{row.detection}</td>
                                    <td className={`px-6 py-4 text-center font-bold text-lg ${isHighRisk ? 'text-red-700' : 'text-gray-900'}`}>
                                        {row.rpn}
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No reasoning errors detected in the subgroup. Log is clear.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
