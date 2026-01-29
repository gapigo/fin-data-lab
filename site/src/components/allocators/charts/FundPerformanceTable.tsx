
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FundWindowStatus {
    ret: number | null;
    meta: number | null;
    bench: number | null;
    status: 'green' | 'yellow' | 'red' | 'gray';
}

interface FundPerformanceRow {
    cnpj: string;
    name: string;
    windows: Record<string, FundWindowStatus>;
}

interface Props {
    funds: FundPerformanceRow[];
    initialSelectedCnpj?: string | null;
}

const STATUS_COLORS = {
    green: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    red: 'bg-red-500/20 border-red-500/50 text-red-400',
    gray: 'bg-gray-700/20 border-gray-700/50 text-gray-400',
};

export const FundPerformanceTable: React.FC<Props> = ({ funds, initialSelectedCnpj }) => {
    const [selectedCnpj, setSelectedCnpj] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (initialSelectedCnpj) {
            setSelectedCnpj(initialSelectedCnpj);
        } else if (funds.length > 0) {
            setSelectedCnpj(funds[0].cnpj);
        }
    }, [initialSelectedCnpj, funds]);

    const selectedFund = funds.find(f => f.cnpj === selectedCnpj) || funds[0];

    if (!selectedFund) return <div className="text-gray-500 text-center py-10">Nenhum fundo disponível</div>;

    const windows = ['6M', '12M', '24M', '36M'];

    return (
        <div className="w-full h-full p-4">
            {/* Dropdown Header */}
            <div className="relative mb-6">
                <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1 block">Fundo Selecionado</label>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-[#151520] border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between text-left hover:border-blue-500 transition-colors"
                >
                    <span className="text-white font-medium truncate pr-4">{selectedFund.name}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-[#1e1e2d] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                        {funds.map(f => (
                            <button
                                key={f.cnpj}
                                onClick={() => { setSelectedCnpj(f.cnpj); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-700 transition-colors ${selectedCnpj === f.cnpj ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'}`}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {windows.map(win => {
                    const data = selectedFund.windows[win];
                    if (!data) return null;

                    const colorClass = STATUS_COLORS[data.status] || STATUS_COLORS.gray;

                    return (
                        <div key={win} className={`border rounded-xl p-4 flex flex-col items-center justify-center ${colorClass.split(' ')[1]} bg-opacity-10`}>
                            <span className="text-gray-400 text-xs font-bold mb-2">{win}</span>

                            <div className="text-2xl font-bold mb-1" style={{ color: 'inherit' }}>
                                {data.ret !== null ? `${data.ret.toFixed(2)}%` : '-'}
                            </div>

                            <div className="w-full border-t border-gray-700/50 my-2"></div>

                            <div className="grid grid-cols-2 w-full text-xs gap-y-1">
                                <div className="text-gray-500">Meta</div>
                                <div className="text-right text-gray-300">{data.meta !== null ? `${data.meta.toFixed(2)}%` : '-'}</div>

                                <div className="text-gray-500">Bench</div>
                                <div className="text-right text-gray-300">{data.bench !== null ? `${data.bench.toFixed(2)}%` : '-'}</div>
                            </div>

                            {/* Status Indicator */}
                            <div className={`mt-3 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${colorClass}`}>
                                {data.status === 'green' ? 'Superou Meta' : data.status === 'yellow' ? 'Superou Bench' : data.status === 'red' ? 'Abaixo' : 'Sem Dados'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
