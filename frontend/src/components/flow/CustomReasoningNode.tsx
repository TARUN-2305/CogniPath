import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

const bgColors = {
    valid: 'bg-green-50 border-green-500',
    warning: 'bg-yellow-50 border-yellow-500',
    invalid: 'bg-red-50 border-red-500'
};

const textColors = {
    valid: 'text-green-700',
    warning: 'text-yellow-700',
    invalid: 'text-red-700'
};

const iconMap = {
    valid: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    invalid: <AlertCircle className="w-5 h-5 text-red-500" />,
};

const CustomReasoningNode = ({ data }: NodeProps) => {
    return (
        <div className={`shadow-lg border-2 rounded-xl p-4 w-72 flex flex-col gap-2 ${bgColors[data.status as keyof typeof bgColors]}`}>
            <Handle type="target" position={Position.Top} className="!bg-gray-400" />

            <div className="flex justify-between items-center border-b pb-2 border-opacity-20 border-gray-500">
                <span className="font-bold text-sm tracking-widest uppercase text-gray-500">Step {data.stepNumber}</span>
                {iconMap[data.status as keyof typeof iconMap]}
            </div>

            <div className="text-sm font-semibold text-gray-800">
                <span className="bg-white/60 px-2 py-1 rounded-md text-xs uppercase tracking-wide mr-2 shadow-sm border">
                    {data.type}
                </span>
            </div>

            <p className={`text-sm mt-1 leading-snug ${textColors[data.status as keyof typeof textColors]}`}>
                {data.text}
            </p>

            {/* Confidence and Bluff Scores */}
            <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-opacity-20 border-gray-500">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                    <span>Confidence</span>
                    <span>{(data.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${data.confidence * 100}%` }}
                    />
                </div>

                {data.bluffScore > 0.5 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-red-600 mt-1 bg-red-100 p-1.5 rounded-md">
                        <AlertTriangle className="w-3 h-3" />
                        High Bluff Score: {(data.bluffScore * 100).toFixed(0)}%
                    </div>
                )}

                {data.errorType && (
                    <div className="text-xs font-bold text-red-600 mt-1">
                        Error: {data.errorType}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
        </div>
    );
};

export default memo(CustomReasoningNode);
