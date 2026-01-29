
import React, { useState, useEffect } from 'react';
import { AllocatorsApi, AllocatorPerformanceData } from '../../services/allocatorsApi';
import { SegmentBarChart } from './charts/SegmentBarChart';
import { BoxPlotChart } from './charts/BoxPlotChart';
import { RiskReturnScatter } from './charts/RiskReturnScatter';
import { FundPerformanceTable } from './charts/FundPerformanceTable';
import { FundMetricsGrid } from './charts/FundMetricsGrid';
import { Loader2 } from 'lucide-react';

interface Props {
    validFilters: { client?: string; segment?: string; peer?: string };
}

export const PerformanceTab: React.FC<Props> = ({ validFilters }) => {
    const [data, setData] = useState<AllocatorPerformanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!validFilters.client) return;

        setLoading(true);
        AllocatorsApi.getPerformanceData(
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
                    <SegmentBarChart data={data.flow_by_segment} xKey="window" dataKey="value" />
                </div>
            </div>

            {/* Visão 2: Detalhamento por Janela */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Performance por Fundo</h3>
                        <p className="text-sm text-gray-400">Retorno dos fundos investidos vs CDI</p>
                    </div>
                </div>
                <div className="min-h-[1000px]">
                    <FundMetricsGrid data={data.fund_detailed_metrics || []} />
                </div>
            </div>

            {/* Visão 3: Box Plots */}
            <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-1">Distribuição de Métricas</h3>
                <p className="text-sm text-gray-400 mb-6">Dispersão dos fundos investidos (Box Plot)</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#151520] rounded-lg p-4 border border-gray-800">
                        <BoxPlotChart data={data.boxplots.ret} name="Retorno" color="#10b981" />
                    </div>
                    <div className="bg-[#151520] rounded-lg p-4 border border-gray-800">
                        <BoxPlotChart data={data.boxplots.vol} name="Volatilidade" color="#f59e0b" />
                    </div>
                    <div className="bg-[#151520] rounded-lg p-4 border border-gray-800">
                        <BoxPlotChart data={data.boxplots.max_dd} name="Max Drawdown" color="#ef4444" />
                    </div>
                </div>
            </div>

            {/* Visão 4: Scatter Plot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-1">Risco x Retorno (12M)</h3>
                    <p className="text-sm text-gray-400 mb-6">Tamanho da bolha representa PL alocado</p>
                    <div className="h-[400px]">
                        <RiskReturnScatter data={data.scatter_12m} />
                    </div>
                </div>

                {/* Visão 5: Tabela Performance */}
                <div className="bg-[#1e1e2d] border border-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-1">Detalhes do Fundo</h3>
                    <p className="text-sm text-gray-400 mb-6">Comparativo Fundo vs Meta vs Bench</p>
                    <div className="h-[400px] overflow-auto custom-scrollbar">
                        <FundPerformanceTable funds={data.fund_performance.funds} initialSelectedCnpj={data.fund_performance.selected_fund} />
                    </div>
                </div>
            </div>

        </div>
    );
};
