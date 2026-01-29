
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BoxPlotStats {
    window: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
}

interface Props {
    data: BoxPlotStats[];
    color?: string;
    name: string;
}

const BoxPlotShape = (props: any) => {
    const { x, y, width, height, payload, stroke } = props;
    const { min, q1, median, q3, max } = payload;

    // Need to map values to pixels
    // Recharts passes `y` and `height` based on the `dataKey` used for the Bar.
    // This is tricky because we need the Y scale.
    // Easier way: The custom shape receives `yAxis` scale function if passed correctly? 
    // No, usually we just get coordinates.

    // Workaround: We can't easily map min/max to pixels inside the shape without the scale.
    // So we often use ComposedChart with ErrorBar or multiple Bars.

    // Let's try the "Stacked Bar" approach for the BOX part, and maybe generic lines for whiskers?
    // Actually, let's keep it simple: Render the IQR as a Bar. And the Median as a Reference Line?
    // Let's try a different approach:
    // Render a simple Bar for Q3. 
    // But obscure the bottom part?

    return <rect x={x} y={y} width={width} height={height} fill={stroke} />;
};

// Simplified Strategy:
// We will use endpoints from the backend to calculate "bar size" and "bottom offset"
// Stacked Bar:
// 1. [Invisible] size = q1
// 2. [Visible Box] size = q3 - q1
// We lose whiskers in this simple view, but for a "Premium" quick dashboard, IQR is often enough, 
// maybe with a dot for Median?
// Or we can try to use ErrorBar for the range min-max?
// ErrorBar requires a single value.
// Let's stick to IQR Box + Median Line (if possible).

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; // Access full object
        return (
            <div className="bg-[#1e1e2d] border border-gray-700 p-3 rounded-lg shadow-xl text-xs">
                <p className="text-gray-300 font-bold mb-2">{label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-500">Max:</span> <span className="text-white text-right">{data.max?.toFixed(2)}%</span>
                    <span className="text-gray-500">Q3:</span> <span className="text-emerald-400 text-right">{data.q3?.toFixed(2)}%</span>
                    <span className="text-gray-500">Median:</span> <span className="text-blue-400 text-right">{data.median?.toFixed(2)}%</span>
                    <span className="text-gray-500">Q1:</span> <span className="text-emerald-400 text-right">{data.q1?.toFixed(2)}%</span>
                    <span className="text-gray-500">Min:</span> <span className="text-white text-right">{data.min?.toFixed(2)}%</span>
                </div>
            </div>
        );
    }
    return null;
};

export const BoxPlotChart: React.FC<Props> = ({ data, color = "#8b5cf6", name }) => {
    // Transform data for Stacked Bar
    // We need: bottom (q1), height (q3-q1)
    const chartData = data.map(d => ({
        ...d,
        bottom: d.q1,
        height: d.q3 - d.q1,
        // For Whisker approximation, we could add error bars if we had time to implement CustomShape properly
    }));

    return (
        <div className="w-full h-full min-h-[250px] flex flex-col">
            <h4 className="text-gray-400 text-sm mb-2 text-center">{name}</h4>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="window" stroke="#6b7280" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <YAxis
                            stroke="#6b7280"
                            tickFormatter={(val) => `${val}%`}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

                        {/* Invisible Bar to lift the box */}
                        <Bar dataKey="bottom" stackId="a" fill="transparent" />

                        {/* The IQR Box */}
                        <Bar dataKey="height" stackId="a" fill={color} radius={[4, 4, 4, 4]} animationDuration={1000}>
                            {/* We could add median line here if we knew how to map coordinates easily */}
                        </Bar>

                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
