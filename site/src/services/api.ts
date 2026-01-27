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
        // Só cachear se a query tiver pelo menos 2 caracteres
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
    }
};
