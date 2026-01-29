
import React, { useState, useEffect } from 'react';
import { AllocatorsApi, AllocatorFlowData } from '../../services/allocatorsApi';
import { MonthlyLineChart } from './charts/MonthlyLineChart';
import { SegmentBarChart } from './charts/SegmentBarChart';
import { Loader2 } from 'lucide-react';

interface Props {
    validFilters: { client?: string; segment?: string; peer?: string };
}

export const FlowPositionTab: React.FC<Props> = ({ validFilters }) => {
    const [data, setData] = useState<AllocatorFlowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [window, setWindow] = useState(12);

    useEffect(() => {
        // Only fetch if client is selected (it's mandatory for meaningful data mostly, but backend handles optional)
        // But user prompts implies "Para aquele cliente". Assuming client is selected in parent.
        if (!validFilters.client) return;

        setLoading(true);
        AllocatorsApi.getFlowData(
            validFilters.client,
            validFilters.segment,
            validFilters.peer,
            window
        ).then(res => {
            setData(res);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [validFilters, window]);

    if (!validFilters.client) {
        return (
            <div className="flex items-center justify-center h-[500px] text-gray-500">
                Selecione um cliente para visualizar os dados
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[500px]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Visão 1: Evolução Mensal */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-1">Evolução Mensal da Posição</h3>
                <p className="text-sm text-gray-400 mb-6">Valor de mercado consolidado mês a mês</p>
                <div className="h-[350px]">
                    <MonthlyLineChart data={data.monthly_position} />
                </div>
            </div>

            {/* Visão 2: Fluxo por Segmento */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Fluxo por Segmento</h3>
                        <p className="text-sm text-gray-400">Distribuição do fluxo líquido por cliente segmentado</p>
                    </div>

                    {/* Window Selector */}
                    <div className="flex bg-[#151520] p-1 rounded-lg">
                        {[6, 12, 24, 36, 48, 60].map(w => (
                            <button
                                key={w}
                                onClick={() => setWindow(w)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${window === w
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    }`}
                            >
                                {w}M
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[350px]">
                    <SegmentBarChart data={data.segment_flow} />
                </div>
            </div>
        </div>
    );
};
