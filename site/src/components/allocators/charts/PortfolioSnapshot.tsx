
import React from 'react';

interface SnapshotItem {
    symbol: string;
    name: string;
    gestor: string;
    peer: string;
    pl: number;
    percentage: number;
}

interface Props {
    data: SnapshotItem[];
}

export const PortfolioSnapshot: React.FC<Props> = ({ data }) => {
    return (
        <div className="w-full h-full overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex flex-col gap-3">
                {data.map((item, idx) => (
                    <div key={idx} className="bg-[#151520] border border-gray-800 rounded-lg p-3 hover:border-gray-600 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs ring-1 ring-blue-500/30">
                                    {item.symbol}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-1" title={item.name}>
                                        {item.name}
                                    </div>
                                    <div className="text-xs text-gray-500">{item.peer} • {item.gestor}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(item.pl)}
                                </div>
                                <div className="text-xs text-emerald-400 font-medium">
                                    {item.percentage.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-emerald-400 rounded-full"
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
