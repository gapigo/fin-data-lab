import { cacheService, generateCacheKey, type CacheType } from './cache';

export interface FundSearchResponse {
    cnpj_fundo: string;
    denom_social: string;
    gestor?: string;
    classe?: string;
    sit?: string;
    dt_ini?: string;
}

export interface FundDetail extends FundSearchResponse {
    publico_alvo?: string;
    dt_reg?: string;
    admin?: string;
    auditor?: string;
    custodiante?: string;
    controlador?: string;
    taxa_adm?: string;
    taxa_perf?: string;
    benchmark?: string;
    condom?: string;
    fundo_exclusivo?: string;
    fundo_cotas?: string;
}

export interface QuotaData {
    dt_comptc: string;
    vl_quota: number;
    vl_patrim_liq?: number;
    vl_total?: number;
    captc_dia?: number;
    resg_dia?: number;
    nr_cotst?: number;
}

export interface FundMetrics {
    rentabilidade_mes: Record<string, Record<string, number>>;
    rentabilidade_ano: Record<string, number>;
    rentabilidade_acumulada: Record<string, number>;
    volatilidade_12m?: number;
    sharpe_12m?: number;
    consistency: {
        pos_months: number;
        neg_months: number;
        best_month: number;
        worst_month: number;
    };
}

export interface CompositionItem {
    name: string;
    value: number;
    percentage: number;
}

export interface FundComposition {
    items: CompositionItem[];
    date?: string;
}

export interface FundSuggestion {
    denom_social: string;
    cnpj_fundo: string;
}

// ============ NEW INTERFACES FOR DETAILED PORTFOLIO ============

export interface AssetPosition {
    nome: string;
    valor: number;
    percentual: number;
    tipo?: string;
    cnpj_emissor?: string;
    dt_venc?: string;
    codigo?: string;
    extra?: Record<string, any>;
}

export interface PortfolioBlock {
    tipo: string;
    nome_display: string;
    total_valor: number;
    total_percentual: number;
    ativos: AssetPosition[];
}

export interface PortfolioDetailed {
    cnpj_fundo: string;
    dt_comptc?: string;
    vl_patrim_liq?: number;
    blocos: PortfolioBlock[];
    resumo: Record<string, number>;
}

export interface FundRelationship {
    cnpj_fundo: string;
    cnpj_relacionado: string;
    nome_relacionado: string;
    tipo_relacao: string;
    valor?: number;
    percentual?: number;
}

export interface FundStructure {
    cnpj_fundo: string;
    nome_fundo: string;
    tipo?: string;
    investe_em: FundRelationship[];
    investido_por: FundRelationship[];
    espelho_de?: string;
}

export interface TopAsset {
    codigo?: string;
    nome: string;
    setor?: string;
    valor: number;
    percentual: number;
    tipo: string;
}

const API_Base = "http://localhost:8000";

/**
 * Wrapper para chamadas de API com cache.
 * Verifica o cache primeiro, e só faz requisição se não houver dados válidos.
 */
async function cachedFetch<T>(
    cacheKey: string,
    cacheType: CacheType,
    fetchFn: () => Promise<T>
): Promise<T> {
    // Tentar obter do cache primeiro
    const cached = await cacheService.get<T>(cacheKey);
    if (cached !== null) {
        console.log(`[API] Usando cache para: ${cacheKey}`);
        return cached;
    }

    // Buscar da API
    console.log(`[API] Buscando da API: ${cacheKey}`);
    const data = await fetchFn();

    // Salvar no cache (não bloquear a execução)
    cacheService.set(cacheKey, data, cacheType).catch(err => {
        console.warn(`[API] Erro ao salvar cache: ${err}`);
    });

    return data;
}

export const FundingService = {
    async suggestFunds(query: string): Promise<FundSuggestion[]> {
        if (query.length < 2) {
            const params = new URLSearchParams();
            params.append("q", query);
            const res = await fetch(`${API_Base}/funds/suggest?${params.toString()}`);
            if (!res.ok) return [];
            return res.json();
        }

        const cacheKey = generateCacheKey('fundSuggest', query.toLowerCase());

        return cachedFetch(cacheKey, 'fundSuggest', async () => {
            const params = new URLSearchParams();
            params.append("q", query);
            const res = await fetch(`${API_Base}/funds/suggest?${params.toString()}`);
            if (!res.ok) return [];
            return res.json();
        });
    },

    async searchFunds(query?: string, limit: number = 50): Promise<FundSearchResponse[]> {
        const cacheKey = generateCacheKey('fundSearch', query || '_all_', limit);

        return cachedFetch(cacheKey, 'fundSearch', async () => {
            const params = new URLSearchParams();
            if (query) params.append("q", query);
            params.append("limit", limit.toString());

            const res = await fetch(`${API_Base}/funds?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to search funds");
            return res.json();
        });
    },

    async getFundDetail(cnpj: string): Promise<FundDetail> {
        const cacheKey = generateCacheKey('fundDetail', cnpj);

        return cachedFetch(cacheKey, 'fundDetail', async () => {
            const res = await fetch(`${API_Base}/funds/${cnpj}`);
            if (!res.ok) throw new Error("Failed to get fund detail");
            return res.json();
        });
    },

    async getFundHistory(cnpj: string, startDate?: string): Promise<QuotaData[]> {
        const cacheKey = generateCacheKey('fundHistory', cnpj, startDate);

        return cachedFetch(cacheKey, 'fundHistory', async () => {
            const params = new URLSearchParams();
            if (startDate) params.append("start_date", startDate);

            const res = await fetch(`${API_Base}/funds/${cnpj}/history?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to get fund history");
            return res.json();
        });
    },

    async getFundMetrics(cnpj: string): Promise<FundMetrics> {
        const cacheKey = generateCacheKey('fundMetrics', cnpj);

        return cachedFetch(cacheKey, 'fundMetrics', async () => {
            const res = await fetch(`${API_Base}/funds/${cnpj}/metrics`);
            if (!res.ok) throw new Error("Failed to get fund metrics");
            return res.json();
        });
    },

    async getFundComposition(cnpj: string): Promise<FundComposition> {
        const cacheKey = generateCacheKey('fundComposition', cnpj);

        return cachedFetch(cacheKey, 'fundComposition', async () => {
            const res = await fetch(`${API_Base}/funds/${cnpj}/composition`);
            if (!res.ok) throw new Error("Failed to get fund composition");
            return res.json();
        });
    },

    // ============ NEW API METHODS ============

    async getPortfolioDetailed(cnpj: string): Promise<PortfolioDetailed> {
        const cacheKey = generateCacheKey('fundPortfolio', cnpj);

        return cachedFetch(cacheKey, 'fundHistory', async () => {
            const res = await fetch(`${API_Base}/funds/${cnpj}/portfolio`);
            if (!res.ok) throw new Error("Failed to get portfolio");
            return res.json();
        });
    },

    async getFundStructure(cnpj: string): Promise<FundStructure> {
        const cacheKey = generateCacheKey('fundStructure', cnpj);

        return cachedFetch(cacheKey, 'fundDetail', async () => {
            const res = await fetch(`${API_Base}/funds/${cnpj}/structure`);
            if (!res.ok) throw new Error("Failed to get fund structure");
            return res.json();
        });
    },

    async getTopAssets(cnpj: string, limit: number = 10): Promise<TopAsset[]> {
        const cacheKey = generateCacheKey('fundTopAssets', cnpj, limit);

        return cachedFetch(cacheKey, 'fundComposition', async () => {
            const params = new URLSearchParams();
            params.append("limit", limit.toString());
            const res = await fetch(`${API_Base}/funds/${cnpj}/top-assets?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to get top assets");
            return res.json();
        });
    },

    /**
     * Limpa todo o cache de API
     */
    async clearCache(): Promise<void> {
        await cacheService.clear();
        console.log('[API] Cache limpo');
    },

    /**
     * Obtém estatísticas do cache
     */
    async getCacheStats() {
        return cacheService.getStats();
    },

    // ============ PEER GROUPS MANAGEMENT ============

    async getPeerGroups(): Promise<PeerGroup[]> {
        const res = await fetch(`${API_Base}/peer-groups`);
        if (!res.ok) throw new Error("Failed to get peer groups");
        return res.json();
    },

    async createPeerGroup(name: string, description?: string, category?: string): Promise<PeerGroup> {
        const res = await fetch(`${API_Base}/peer-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, category })
        });
        if (!res.ok) throw new Error("Failed to create peer group");
        return res.json();
    },

    async getPeerGroupDetails(groupId: number): Promise<PeerGroupDetail> {
        const res = await fetch(`${API_Base}/peer-groups/${groupId}`);
        if (!res.ok) throw new Error("Failed to get peer group details");
        return res.json();
    },

    async deletePeerGroup(groupId: number): Promise<boolean> {
        const res = await fetch(`${API_Base}/peer-groups/${groupId}`, {
            method: 'DELETE'
        });
        return res.ok;
    },

    async addFundToPeerGroup(groupId: number, fund: { cnpj: string, nickname?: string, peer_cat?: string, description?: string, comment?: string }): Promise<PeerFund> {
        const res = await fetch(`${API_Base}/peer-groups/${groupId}/funds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cnpj_fundo: fund.cnpj,
                apelido: fund.nickname,
                peer_cat: fund.peer_cat,
                descricao: fund.description,
                comentario: fund.comment
            })
        });
        if (!res.ok) throw new Error("Failed to add fund to peer group");
        return res.json();
    },

    async updateFundInPeerGroup(groupId: number, cnpj: string, data: { nickname?: string, peer_cat?: string, description?: string, comment?: string }): Promise<PeerFund> {
        const res = await fetch(`${API_Base}/peer-groups/${groupId}/funds/${cnpj.replace(/\D/g, '')}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cnpj_fundo: cnpj, // Needed for validation? Check schema
                apelido: data.nickname,
                peer_cat: data.peer_cat,
                descricao: data.description,
                comentario: data.comment
            })
        });
        if (!res.ok) throw new Error("Failed to update fund in peer group");
        return res.json();
    },

    async removeFundFromPeerGroup(groupId: number, cnpj: string): Promise<boolean> {
        const res = await fetch(`${API_Base}/peer-groups/${groupId}/funds/${cnpj.replace(/\D/g, '')}`, {
            method: 'DELETE'
        });
        return res.ok;
    },

    // ============ ALLOCATORS DASHBOARD ============

    async getAllocatorFilters(): Promise<AllocatorFilters> {
        const cacheKey = 'allocatorFilters';
        return cachedFetch(cacheKey, 'allocatorFilters', async () => {
            const res = await fetch(`${API_Base}/allocators/filters`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        });
    },

    async getAllocatorFlow(client?: string, segment?: string, peer?: string, window: number = 12): Promise<AllocatorFlowData> {
        const cacheKey = generateCacheKey('allocatorFlow', client, segment, peer, window);
        return cachedFetch(cacheKey, 'allocatorFlow', async () => {
            const p = new URLSearchParams();
            if (client) p.append('client', client);
            if (segment && segment !== 'all') p.append('segment', segment);
            if (peer && peer !== 'all') p.append('peer', peer);
            p.append('window', window.toString());
            const res = await fetch(`${API_Base}/allocators/flow?${p.toString()}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        });
    },

    async getAllocatorPerformance(client?: string, segment?: string, peer?: string): Promise<AllocatorPerformanceData> {
        const cacheKey = generateCacheKey('allocatorPerf', client, segment, peer);
        return cachedFetch(cacheKey, 'allocatorPerf', async () => {
            const p = new URLSearchParams();
            if (client) p.append('client', client);
            if (segment && segment !== 'all') p.append('segment', segment);
            if (peer && peer !== 'all') p.append('peer', peer);
            const res = await fetch(`${API_Base}/allocators/performance?${p.toString()}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        });
    },

    async getAllocatorAllocation(client?: string, segment?: string, peer?: string): Promise<AllocatorAllocationData> {
        const cacheKey = generateCacheKey('allocatorAlloc', client, segment, peer);
        return cachedFetch(cacheKey, 'allocatorAlloc', async () => {
            const p = new URLSearchParams();
            if (client) p.append('client', client);
            if (segment && segment !== 'all') p.append('segment', segment);
            if (peer && peer !== 'all') p.append('peer', peer);
            const res = await fetch(`${API_Base}/allocators/allocation?${p.toString()}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        });
    }
};

export interface PeerGroup {
    id: number;
    name: string;
    description?: string;
    category?: string;
    created_at?: string;
    fund_count?: number;
}

export interface PeerFund {
    id: number;
    group_id: number;
    cnpj_fundo: string;
    apelido?: string;
    peer_cat?: string;
    descricao?: string;
    comentario?: string;
    denom_social?: string; // Do join com cadastro
    gestor?: string;
    classe?: string;
    sit?: string;
    // Campos calculados ou extras:
    pl?: number;
    manager?: string; // alias para gestor
    name?: string; // alias para denom_social
    peer_id?: string; // mapping to frontend id
}

export interface PeerGroupDetail extends PeerGroup {
    funds: PeerFund[];
}

export interface AllocatorFilters {
    clients: string[];
    segments: string[];
    segments_by_client: Record<string, string[]>;
    peers: string[];
}

export interface AllocatorFlowData {
    evolution: { month: string; date: string; value: number; multimercado: number }[];
    flow_distribution: { client: string; flow: number }[];
}

export interface AllocatorPerformanceData {
    flow_by_window: { window: string; value: number }[];
    metrics_ret: { window: string; q1: number; median: number; q3: number }[];
    metrics_vol: { window: string; q1: number; median: number; q3: number }[];
    metrics_dd: { window: string; q1: number; median: number; q3: number }[];
    scatter_12m: { x: number; y: number; z: number; name: string }[];
    performance_table: {
        name: string;
        cnpj: string;
        [key: string]: { value: number | null; status: string } | string;
    }[];
}

export interface AllocatorAllocationData {
    flow_by_window: { window: string; value: number }[];
    evolution: Record<string, any>[];
    gestores: string[];
    movement_diff: { month: string; value: number }[];
    snapshot: { symbol: string; name: string; desc: string; pl: number; value: number }[];
    pie_data: { name: string; value: number; pl: number }[];
}
