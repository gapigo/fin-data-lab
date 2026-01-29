
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
    data: any[]; // Array of objects
    keys: string[]; // List of gestores
}

const COLORS = [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#d946ef', // Fuchsia
    '#14b8a6', // Teal
    '#f97316', // Orange
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Sort payload by value descending for readability
        const sorted = [...payload].sort((a, b) => b.value - a.value);

        return (
            <div className="bg-[#1e1e2d] border border-gray-700 p-3 rounded-lg shadow-xl text-xs">
                <p className="text-gray-300 font-bold mb-2 border-b border-gray-700 pb-1">{label}</p>
                <div className="flex flex-col gap-1">
                    {sorted.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-gray-400">{item.name}</span>
                            </div>
                            <span className="text-white font-mono">
                                {new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export const StackedEvolutionChart: React.FC<Props> = ({ data = [], keys = [] }) => {
    return (
        <div className="w-full h-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="month"
                        stroke="#9ca3af"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tickFormatter={(value) =>
                            new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)
                        }
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        iconSize={8}
                    />

                    {keys.map((key, index) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="a"
                            fill={COLORS[index % COLORS.length]}
                            animationDuration={1500}
                            maxBarSize={60}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
