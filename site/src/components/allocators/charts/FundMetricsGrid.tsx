
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, Cell
} from 'recharts';
import { FundDetailedMetric } from '../../../services/allocatorsApi';

interface Props {
    data: FundDetailedMetric[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="bg-[#1e1e2d] border border-gray-700 p-3 rounded shadow-xl">
                <p className="text-white font-bold">{item.fund_name}</p>
                <p className="text-gray-400 text-xs mb-2">{item.fund_cnpj}</p>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Retorno:</span>
                        <span className="text-white font-mono">{(item.ret * 100).toFixed(2)}%</span>
                    </div>
                    {item.bench && (
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">CDI:</span>
                            <span className="text-gray-300 font-mono">{(item.bench * 100).toFixed(2)}%</span>
                        </div>
                    )}
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Vol:</span>
                        <span className="text-gray-300 font-mono">{(item.vol * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Sharpe:</span>
                        <span className="text-gray-300 font-mono">{item.sharpe?.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const WindowChart = ({ window, items }: { window: string, items: FundDetailedMetric[] }) => {
    // Sort items by return descending? Or alphabetical?
    // User screenshot seems sorted differently? Or maybe not sorted.
    // I'll sort by return descending for clarity.
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => (b.ret || 0) - (a.ret || 0));
    }, [items]);

    // Determine CDI value (bench)
    const cdiValue = items.find(i => i.bench !== null)?.bench || 0;

    return (
        <div className="h-[250px] w-full bg-[#1e1e2d] rounded-lg border border-gray-800 p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Retorno {window}</h4>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedItems}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="fund_name"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* CDI Line */}
                    {cdiValue > 0 && (
                        <ReferenceLine y={cdiValue} stroke="#fbbf24" strokeDasharray="3 3">
                            <Label
                                value={`CDI: ${(cdiValue * 100).toFixed(1)}%`}
                                position="insideTopRight"
                                fill="#fbbf24"
                                fontSize={10}
                            />
                        </ReferenceLine>
                    )}

                    <Bar dataKey="ret" radius={[4, 4, 0, 0]}>
                        {sortedItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.ret && entry.ret >= 0 ? "#3b82f6" : "#ef4444"} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const FundMetricsGrid: React.FC<Props> = ({ data = [] }) => {
    // Group by window
    const byWindow = useMemo(() => {
        const groups: Record<string, FundDetailedMetric[]> = {
            '6M': [], '12M': [], '24M': [], '36M': []
        };
        data.forEach(item => {
            if (groups[item.window]) {
                groups[item.window].push(item);
            }
        });
        return groups;
    }, [data]);

    return (
        <div className="grid grid-cols-1 grid-rows-4 gap-6">
            {['6M', '12M', '24M', '36M'].map(window => (
                <WindowChart key={window} window={window} items={byWindow[window]} />
            ))}
        </div>
    );
};
