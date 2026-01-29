
import React, { useState, useEffect } from 'react';
import { AllocatorsApi, AllocatorFilters } from '../services/allocatorsApi';
import { FlowPositionTab } from '../components/allocators/FlowPositionTab';
import { PerformanceTab } from '../components/allocators/PerformanceTab';
import { AllocationTab } from '../components/allocators/AllocationTab';
import { Wallet, BarChart3, PieChart, Filter } from 'lucide-react';

const AllocatorsIntelligence: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'flow' | 'performance' | 'allocation'>('flow');
    const [filters, setFilters] = useState<AllocatorFilters | null>(null);

    // Selection State
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedPeer, setSelectedPeer] = useState<string>('Multimercado'); // Default as per user context
    const [selectedSegment, setSelectedSegment] = useState<string>('Todos Segmentos');

    useEffect(() => {
        AllocatorsApi.getFilters().then(res => {
            setFilters(res);
            // Set default client if none selected, but ideally user selects.
            // Let's pick 'Itaú' if available or first one.
            if (res.clients.includes('Itaú')) setSelectedClient('Itaú');
            else if (res.clients.length > 0) setSelectedClient(res.clients[0]);
        });
    }, []);

    // Filter segments based on selected client
    const availableSegments = filters?.segments_by_client?.[selectedClient] || [];

    return (
        <div className="min-h-screen bg-[#151520] pb-20"> {/* Premium Dark Background */}

            {/* Header & Filters */}
            <div className="sticky top-0 z-30 bg-[#151520]/80 backdrop-blur-md border-b border-gray-800 px-8 py-6">
                <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">

                    {/* Title & Tabs */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Wallet className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                                Allocators Intelligence
                            </h1>
                        </div>

                        <div className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('flow')}
                                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'flow' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Fluxo & Posição
                                {activeTab === 'flow' && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('performance')}
                                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'performance' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Performance
                                {activeTab === 'performance' && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('allocation')}
                                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'allocation' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Alocação
                                {activeTab === 'allocation' && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        {/* Client Select */}
                        <div className="relative group">
                            <select
                                value={selectedClient}
                                onChange={(e) => { setSelectedClient(e.target.value); setSelectedSegment('Todos Segmentos'); }}
                                className="appearance-none bg-[#1e1e2d] border border-gray-700 text-white pl-4 pr-10 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500 hover:border-gray-600 transition-colors cursor-pointer min-w-[140px]"
                            >
                                {filters?.clients.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Peer Select */}
                        <div className="relative group">
                            <select
                                value={selectedPeer}
                                onChange={(e) => setSelectedPeer(e.target.value)}
                                className="appearance-none bg-[#1e1e2d] border border-gray-700 text-white pl-4 pr-10 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500 hover:border-gray-600 transition-colors cursor-pointer min-w-[140px]"
                            >
                                <option value="all">Todos Peers</option>
                                {filters?.peers.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Segment Select */}
                        <div className="relative group">
                            <select
                                value={selectedSegment}
                                onChange={(e) => setSelectedSegment(e.target.value)}
                                className="appearance-none bg-[#1e1e2d] border border-gray-700 text-white pl-4 pr-10 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-500 hover:border-gray-600 transition-colors cursor-pointer min-w-[180px]"
                                disabled={!selectedClient}
                            >
                                <option value="Todos Segmentos">Todos Segmentos</option>
                                {availableSegments.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto px-8 py-8 animate-in fade-in duration-500">
                <div className="mb-4">
                    {/* Dynamic Summary based on selection */}
                    <div className="text-gray-400 text-sm">
                        Analísando carteira de <span className="text-emerald-400 font-bold">{selectedClient}</span>
                        {selectedPeer !== 'all' && <> em <span className="text-white font-bold">{selectedPeer}</span></>}
                        {selectedSegment !== 'Todos Segmentos' && <> (Segmento: <span className="text-white font-bold">{selectedSegment}</span>)</>}
                    </div>
                </div>

                {activeTab === 'flow' && (
                    <FlowPositionTab
                        validFilters={{
                            client: selectedClient,
                            segment: selectedSegment === 'Todos Segmentos' ? undefined : selectedSegment,
                            peer: selectedPeer === 'all' ? undefined : selectedPeer
                        }}
                    />
                )}

                {activeTab === 'performance' && (
                    <PerformanceTab
                        validFilters={{
                            client: selectedClient,
                            segment: selectedSegment === 'Todos Segmentos' ? undefined : selectedSegment,
                            peer: selectedPeer === 'all' ? undefined : selectedPeer
                        }}
                    />
                )}

                {activeTab === 'allocation' && (
                    <AllocationTab
                        validFilters={{
                            client: selectedClient,
                            segment: selectedSegment === 'Todos Segmentos' ? undefined : selectedSegment,
                            peer: selectedPeer === 'all' ? undefined : selectedPeer
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default AllocatorsIntelligence;
