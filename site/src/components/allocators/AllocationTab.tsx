
import React, { useState, useEffect, useMemo } from 'react';
import { AllocatorsApi, AllocatorAllocationData } from '../../services/allocatorsApi';
import { SegmentBarChart } from './charts/SegmentBarChart';
import { StackedEvolutionChart } from './charts/StackedEvolutionChart';
import { AllocationPieChart } from './charts/AllocationPieChart';
import { PortfolioSnapshot } from './charts/PortfolioSnapshot';
import { Loader2 } from 'lucide-react';

interface Props {
    validFilters: { client?: string; segment?: string; peer?: string };
}

export const AllocationTab: React.FC<Props> = ({ validFilters }) => {
    const [data, setData] = useState<AllocatorAllocationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!validFilters.client) return;

        setLoading(true);
        AllocatorsApi.getAllocationData(
            validFilters.client,
            validFilters.segment,
            validFilters.peer
        ).then(res => {
            setData(res);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [validFilters]);

    // Transform diff data for Stacked Chart
    const diffChartData = useMemo(() => {
        if (!data?.month_difference) return { data: [], keys: [] };

        // Group by Month
        const grouped: Record<string, any> = {};
        const gestores = new Set<string>();

        data.month_difference.forEach(item => {
            if (!grouped[item.month]) grouped[item.month] = { month: item.month };
            grouped[item.month][item.gestor] = item.difference;
            gestores.add(item.gestor);
        });

        // Convert to array
        const result = Object.values(grouped);
        // Sort by something? Backend already returns specific order? Usually months.
        // Assuming backend returns roughly sorted or I rely on Month string sort... 
        // Ideally backend gives ISO date but here usage is mostly visual.
        // I can sort if "month" is "Jan/24". Recharts renders in order of array.
        // I'll trust backend order for now or simplistic reverse.

        return { data: result, keys: Array.from(gestores) };
    }, [data]);

    if (!validFilters.client) return <div className="text-gray-500 text-center py-20">Selecione um cliente</div>;
    if (loading && !data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
    if (!data) return null;

    return (
        <div className="space-y-6">

            {/* Visão 1: Fluxo por Janela */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-1">Fluxo Líquido por Janela</h3>
                <p className="text-sm text-gray-400 mb-6">Consolidado dos fundos segmentados</p>
                <div className="h-[300px]">
                    <SegmentBarChart data={data.flow_by_window} xKey="window" dataKey="value" />
                </div>
            </div>

            {/* Visão 2: Evolução por Gestor */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-1">Evolução de Alocação por Gestor (5 Anos)</h3>
                <p className="text-sm text-gray-400 mb-6">Top gestores alocados</p>
                <div className="h-[400px]">
                    <StackedEvolutionChart data={data.evolution} keys={data.gestores} />
                </div>
            </div>

            {/* Visão 3: Diferença MoM */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-1">Movimentação Mensal por Gestor</h3>
                <p className="text-sm text-gray-400 mb-6">Variação da posição em relação ao mês anterior</p>
                <div className="h-[350px]">
                    <StackedEvolutionChart data={diffChartData.data} keys={diffChartData.keys} />
                </div>
            </div>

            {/* Visão 4 & 5: Snapshot e Pizza */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Snapshot List */}
                <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg max-h-[600px] flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-1">Carteira Atual Detalhada</h3>
                    <p className="text-sm text-gray-400 mb-6">Principais posições por fundo</p>
                    <div className="flex-1 overflow-auto min-h-[300px]">
                        <PortfolioSnapshot data={data.portfolio_snapshot} />
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-1">Distribuição Atual (Gestores)</h3>
                    <p className="text-sm text-gray-400 mb-6">% da carteira por gestora</p>
                    <div className="h-[400px]">
                        <AllocationPieChart data={data.pie_data} />
                    </div>
                </div>
            </div>

        </div>
    );
};
