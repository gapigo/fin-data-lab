
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

export const FundingService = {
    async suggestFunds(query: string): Promise<FundSuggestion[]> {
        const params = new URLSearchParams();
        params.append("q", query);
        const res = await fetch(`${API_Base}/funds/suggest?${params.toString()}`);
        if (!res.ok) return []; // Fail silently for autocomplete
        return res.json();
    },

    async searchFunds(query?: string, limit: number = 50): Promise<FundSearchResponse[]> {
        const params = new URLSearchParams();
        if (query) params.append("q", query);
        params.append("limit", limit.toString());

        const res = await fetch(`${API_Base}/funds?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to search funds");
        return res.json();
    },

    async getFundDetail(cnpj: string): Promise<FundDetail> {
        const res = await fetch(`${API_Base}/funds/${cnpj}`);
        if (!res.ok) throw new Error("Failed to get fund detail");
        return res.json();
    },

    async getFundHistory(cnpj: string, startDate?: string): Promise<QuotaData[]> {
        const params = new URLSearchParams();
        if (startDate) params.append("start_date", startDate);

        const res = await fetch(`${API_Base}/funds/${cnpj}/history?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to get fund history");
        return res.json();
    },

    async getFundMetrics(cnpj: string): Promise<FundMetrics> {
        const res = await fetch(`${API_Base}/funds/${cnpj}/metrics`);
        if (!res.ok) throw new Error("Failed to get fund metrics");
        return res.json();
    },

    async getFundComposition(cnpj: string): Promise<FundComposition> {
        const res = await fetch(`${API_Base}/funds/${cnpj}/composition`);
        if (!res.ok) throw new Error("Failed to get fund composition");
        return res.json();
    }
};
