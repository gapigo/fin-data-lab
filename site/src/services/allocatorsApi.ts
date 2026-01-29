
import { cacheService, generateCacheKey, type CacheType } from './cache';

const API_Base = "http://localhost:8000";

/**
 * Wrapper for cached fetch specifically for allocators
 */
async function cachedFetch<T>(
    cacheKey: string,
    cacheType: CacheType,
    fetchFn: () => Promise<T>
): Promise<T> {
    const cached = await cacheService.get<T>(cacheKey);
    if (cached !== null) {
        return cached;
    }
    const data = await fetchFn();
    cacheService.set(cacheKey, data, cacheType).catch(console.warn);
    return data;
}

// ================= INTERFACES =================

export interface AllocatorFilters {
    clients: string[];
    segments: string[];
    segments_by_client: Record<string, string[]>;
    peers: string[];
}

// --- Tab 1: Flow & Position ---
export interface MonthlyPosition {
    month: string; // "Jan/24"
    date: string;  // ISO
    position: number;
}

export interface SegmentFlow {
    segment: string;
    flow: number;
}

export interface AllocatorFlowData {
    monthly_position: MonthlyPosition[];
    segment_flow: SegmentFlow[];
    selected_window: number;
}

// --- Tab 2: Performance ---
export interface FlowBySegmentWindow {
    window: string;
    value: number;
}

export interface ReturnByWindow {
    window: string;
    value: number;
}

export interface BoxPlotStat {
    window: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
}

export interface ScatterPoint {
    x: number; // vol
    y: number; // ret
    z: number; // size
    name: string;
}

export interface FundWindowStatus {
    ret: number | null;
    meta: number | null;
    bench: number | null;
    status: 'green' | 'yellow' | 'red' | 'gray';
}

export interface FundPerformanceRow {
    cnpj: string;
    name: string;
    windows: Record<string, FundWindowStatus>; // '6M', '12M'...
}

export interface AllocatorPerformanceData {
    flow_by_segment: FlowBySegmentWindow[];
    returns_by_window: ReturnByWindow[];
    boxplots: {
        ret: BoxPlotStat[];
        vol: BoxPlotStat[];
        max_dd: BoxPlotStat[];
    };
    scatter_12m: ScatterPoint[];
    fund_performance: {
        funds: FundPerformanceRow[];
        selected_fund: string | null;
    };
    fund_detailed_metrics: FundDetailedMetric[];
}

export interface FundDetailedMetric {
    client: string;
    segment: string;
    fund_cnpj: string;
    fund_name: string;
    window: string;
    ret: number | null;
    vol: number | null;
    max_dd: number | null;
    sharpe: number | null;
    bench: number | null;
}

// --- Tab 3: Allocation ---

export interface MonthlyEvolution {
    data: Array<Record<string, any>>; // { month, date, "Gestor1": val, "Gestor2": val... }
    gestores: string[];
}

export interface MonthDifference {
    gestor: string;
    month: string;
    difference: number;
}

export interface PortfolioSnapshotItem {
    symbol: string;
    name: string;
    gestor: string;
    peer: string;
    pl: number;
    percentage: number;
}

export interface PieChartItem {
    name: string;
    value: number;
    pl: number;
}

export interface AllocatorAllocationData {
    flow_by_window: FlowBySegmentWindow[]; // Adjusted name
    evolution: Record<string, any>[]; // Backend returns array of dicts
    gestores: string[]; // Backend returns list of strings
    month_difference: MonthDifference[];
    portfolio_snapshot: PortfolioSnapshotItem[]; // This needs to check item mismatch too
    pie_data: PieChartItem[];
}

// ================= SERVICE =================

export const AllocatorsApi = {

    async getFilters(): Promise<AllocatorFilters> {
        const cacheKey = 'allocator_filters';
        return cachedFetch(cacheKey, 'allocatorFilters', async () => {
            const res = await fetch(`${API_Base}/allocators/filters`);
            if (!res.ok) throw new Error("Failed to fetch filters");
            return res.json();
        });
    },

    async getFlowData(
        client: string,
        segment?: string,
        peer?: string,
        window: number = 12
    ): Promise<AllocatorFlowData> {
        const cacheKey = generateCacheKey('allocatorFlow_v2', client, segment || 'all', peer || 'all', window);
        return cachedFetch(cacheKey, 'allocatorFlow_v2', async () => {
            const params = new URLSearchParams();
            if (client) params.append('client', client);
            if (segment && segment !== 'all') params.append('segment', segment);
            if (peer && peer !== 'all') params.append('peer', peer);
            params.append('window', window.toString());

            const res = await fetch(`${API_Base}/allocators/flow?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch flow data");
            return res.json();
        });
    },

    async getPerformanceData(
        client: string,
        segment?: string,
        peer?: string
    ): Promise<AllocatorPerformanceData> {
        const cacheKey = generateCacheKey('allocatorPerf_v3', client, segment || 'all', peer || 'all');
        return cachedFetch(cacheKey, 'allocatorPerf_v3', async () => {
            const params = new URLSearchParams();
            if (client) params.append('client', client);
            if (segment && segment !== 'all') params.append('segment', segment);
            if (peer && peer !== 'all') params.append('peer', peer);

            const res = await fetch(`${API_Base}/allocators/performance?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch performance data");
            return res.json();
        });
    },

    async getAllocationData(
        client: string,
        segment?: string,
        peer?: string
    ): Promise<AllocatorAllocationData> {
        const cacheKey = generateCacheKey('allocatorAlloc_v3', client, segment || 'all', peer || 'all');
        return cachedFetch(cacheKey, 'allocatorAlloc_v3', async () => {
            const params = new URLSearchParams();
            if (client) params.append('client', client);
            if (segment && segment !== 'all') params.append('segment', segment);
            if (peer && peer !== 'all') params.append('peer', peer);

            const res = await fetch(`${API_Base}/allocators/allocation?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch allocation data");
            return res.json();
        });
    },

    // Clear specific allocator caches
    async clearAllocatorCache() {
        // This is a simplified clear, ideally we'd use pattern matching on keys if supported
        // or just clear all since this is an admin/debug action usually
        // For now, we rely on the generic clearCache from the main api or cache service
    }
};
