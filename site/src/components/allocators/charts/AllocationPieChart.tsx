
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PieData {
    name: string;
    value: number; // percentage
    pl: number; // absolute value
}

interface Props {
    data: PieData[];
}

const COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
    '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
    '#6366f1', '#d946ef'
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#1e1e2d] border border-gray-700 p-3 rounded-lg shadow-xl text-xs">
                <p className="text-white font-bold mb-1">{data.name}</p>
                <div className="text-gray-300">
                    Part: <span className="text-emerald-400 font-bold">{data.value.toFixed(2)}%</span>
                </div>
                <div className="text-gray-400">
                    PL: <span className="text-white">R$ {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(data.pl)}</span>
                </div>
            </div>
        );
    }
    return null;
};

const renderLegend = (props: any) => {
    const { payload } = props;

    return (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
            {payload.map((entry: any, index: number) => (
                <li key={`item-${index}`} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-400 truncate max-w-[120px]" title={entry.value}>{entry.value}</span>
                </li>
            ))}
        </ul>
    );
};

export const AllocationPieChart: React.FC<Props> = ({ data }) => {
    return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={renderLegend} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
