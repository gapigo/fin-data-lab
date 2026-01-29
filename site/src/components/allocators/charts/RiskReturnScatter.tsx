
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScatterPoint {
    x: number; // Vol
    y: number; // Ret
    z: number; // Size/PL
    name: string;
}

interface Props {
    data: ScatterPoint[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#1e1e2d] border border-gray-700 p-3 rounded-lg shadow-xl text-xs">
                <p className="text-white font-bold mb-1 max-w-[200px] truncate">{data.name}</p>
                <div className="flex flex-col gap-1">
                    <div><span className="text-gray-400">Retorno:</span> <span className="text-emerald-400">{data.y?.toFixed(2)}%</span></div>
                    <div><span className="text-gray-400">Volatilidade:</span> <span className="text-blue-400">{data.x?.toFixed(2)}%</span></div>
                    <div><span className="text-gray-400">PL:</span> <span className="text-gray-200">R$ {data.z?.toFixed(1)}M</span></div>
                </div>
            </div>
        );
    }
    return null;
};

export const RiskReturnScatter: React.FC<Props> = ({ data }) => {
    // Generate different colors for aesthetics or use a gradient scheme
    const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

    return (
        <div className="w-full h-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        name="Volatilidade"
                        unit="%"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Volatilidade (12M)', position: 'bottom', fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name="Retorno"
                        unit="%"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Retorno (12M)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 600]} name="PL" />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Fundos" data={data} fill="#8884d8">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.7} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};
