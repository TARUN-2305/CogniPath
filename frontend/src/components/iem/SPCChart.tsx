'use client';
import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ReferenceLine, ResponsiveContainer
} from 'recharts';

interface SPCChartProps {
    dataPoints: number[];
    ucl: number;
    lcl: number;
    centerLine: number;
    title: string;
}

export const SPCChart: React.FC<SPCChartProps> = ({ dataPoints, ucl, lcl, centerLine, title }) => {
    const data = useMemo(() => {
        return dataPoints.map((val, idx) => ({
            name: `S${idx + 1}`,
            value: val,
        }));
    }, [dataPoints]);

    return (
        <div className="w-full h-80 bg-white p-4 rounded-xl shadow-md border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="name" />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3b82f6' }}
                        activeDot={{ r: 6 }}
                        name="Subgroup Mean (X-bar)"
                    />
                    {/* Centerline (Grand Average X-double-bar) */}
                    <ReferenceLine y={centerLine} stroke="#22c55e" strokeWidth={2} label={{ position: 'right', value: 'CL', fill: '#22c55e' }} />
                    {/* Upper Control Limit */}
                    <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ position: 'right', value: 'UCL', fill: '#ef4444' }} />
                    {/* Lower Control Limit */}
                    <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ position: 'right', value: 'LCL', fill: '#ef4444' }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
