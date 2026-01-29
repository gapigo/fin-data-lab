
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DataPoint {
    segment: string; // or window
    flow?: number;
    value?: number; // Generic value
}

interface Props {
    data: any[];
    dataKey?: string;
    xKey?: string;
    color?: string;
    positiveColor?: string;
    negativeColor?: string;
    formatValue?: boolean;
}

const CustomTooltip = ({ active, payload, label, formatValue }: any) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        return (
            <div className="bg-[#1e1e2d] border border-gray-700 p-3 rounded-lg shadow-xl">
                <p className="text-gray-300 font-medium mb-1">{label}</p>
                <p className={`font-bold text-lg ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatValue
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)
                        : val
                    }
                </p>
            </div>
        );
    }
    return null;
};

export const SegmentBarChart: React.FC<Props> = ({
    data = [],
    dataKey = "flow",
    xKey = "segment",
    color = "#3b82f6",
    positiveColor = "#ef4444", // Red for allocators often implies flow OUT or just consistency? Wait, User asked for premium aesthetics.
    // Actually, usually Flow: Positive (Green) / Negative (Red).
    // But request images showed Red bars. I will stick to what looks good or provided props.
    // The user prompt screenshot shows RED bars for positive values? Or maybe they are negative?
    // Let's assume standard Green/Red unless overridden.
    negativeColor = "#ef4444",
    formatValue = true
}) => {

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey={xKey}
                        stroke="#9ca3af"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        interval={0}
                    // angle={-45}
                    // textAnchor="end"
                    // height={60}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tickFormatter={(value) =>
                            new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)
                        }
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip formatValue={formatValue} />} />
                    <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} animationDuration={1500}>
                        {data.map((entry, index) => {
                            const val = (entry as any)[dataKey];
                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={val >= 0 ? positiveColor : negativeColor}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
