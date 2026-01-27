import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '@/services/cache';
import { FundingService } from '@/services/api';

interface CacheStats {
    totalEntries: number;
    todayEntries: number;
    size: string;
}

/**
 * Hook para monitorar estatísticas do cache
 */
export function useCacheStats(refreshInterval: number = 30000) {
    const [stats, setStats] = useState<CacheStats | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshStats = useCallback(async () => {
        try {
            const newStats = await cacheService.getStats();
            setStats(newStats);
        } catch (err) {
            console.error('Erro ao obter estatísticas do cache:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshStats();

        // Atualizar periodicamente
        const interval = setInterval(refreshStats, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshStats, refreshInterval]);

    const clearCache = useCallback(async () => {
        await FundingService.clearCache();
        await refreshStats();
    }, [refreshStats]);

    return { stats, loading, refreshStats, clearCache };
}

/**
 * Hook que monitora se dados vieram do cache ou da API
 */
export function useCacheIndicator() {
    const [fromCache, setFromCache] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const markFromCache = useCallback(() => {
        setFromCache(true);

        // Resetar após 2 segundos
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setFromCache(false);
        }, 2000);
    }, []);

    const markFromApi = useCallback(() => {
        setFromCache(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return { fromCache, markFromCache, markFromApi };
}

/**
 * Hook para fazer requisições com feedback de cache
 */
export function useCachedFetch<T>(
    fetchFn: () => Promise<T>,
    deps: React.DependencyList = []
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [fromCache, setFromCache] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Monitorar logs do console para detectar cache hit
        const originalLog = console.log;
        let wasFromCache = false;

        console.log = (...args) => {
            originalLog.apply(console, args);
            if (typeof args[0] === 'string' && args[0].includes('[API] Usando cache')) {
                wasFromCache = true;
            }
        };

        try {
            const result = await fetchFn();
            setData(result);
            setFromCache(wasFromCache);
        } catch (err) {
            setError(err as Error);
        } finally {
            console.log = originalLog;
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, fetchFn]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, fromCache, refetch: fetch };
}
