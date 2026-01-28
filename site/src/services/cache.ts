/**
 * API Cache Service
 * 
 * Sistema de cache robusto para armazenar respostas de API no IndexedDB.
 * Os dados são automaticamente invalidados no próximo dia.
 * 
 * Features:
 * - Persistência via IndexedDB (suporta grandes volumes de dados)
 * - Fallback para localStorage se IndexedDB não disponível
 * - Invalidação automática diária
 * - Versionamento para updates do schema
 * - TTL customizável por tipo de dado
 */

const DB_NAME = 'fin-data-lab-cache';
const DB_VERSION = 1;
const STORE_NAME = 'api-cache';

interface CacheEntry<T> {
    key: string;
    data: T;
    timestamp: number;
    expiresAt: number;
    dateKey: string; // YYYY-MM-DD format para invalidação diária
}

// Duração do cache em milissegundos
const CACHE_DURATIONS = {
    fundDetail: 24 * 60 * 60 * 1000,     // 24 horas
    fundHistory: 24 * 60 * 60 * 1000,    // 24 horas
    fundMetrics: 24 * 60 * 60 * 1000,    // 24 horas
    fundComposition: 24 * 60 * 60 * 1000, // 24 horas
    fundPortfolio: 24 * 60 * 60 * 1000,   // 24 horas
    fundStructure: 24 * 60 * 60 * 1000,   // 24 horas
    fundTopAssets: 24 * 60 * 60 * 1000,   // 24 horas
    fundSearch: 12 * 60 * 60 * 1000,     // 12 horas (buscas são mais dinâmicas)
    fundSuggest: 6 * 60 * 60 * 1000,     // 6 horas (sugestões podem mudar mais frequentemente)
    allocatorFilters: 24 * 60 * 60 * 1000, // 24 horas
    allocatorFlow: 12 * 60 * 60 * 1000,    // 12 horas
    allocatorPerf: 12 * 60 * 60 * 1000,    // 12 horas
    allocatorAlloc: 12 * 60 * 60 * 1000,   // 12 horas
    default: 24 * 60 * 60 * 1000,        // 24 horas
} as const;

type CacheType = keyof typeof CACHE_DURATIONS;

/**
 * Obtém a data atual no formato YYYY-MM-DD
 */
function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Gera uma chave de cache única baseada nos parâmetros
 */
function generateCacheKey(type: CacheType, ...params: (string | number | undefined)[]): string {
    const sanitizedParams = params
        .filter(p => p !== undefined)
        .map(p => String(p).replace(/[^a-zA-Z0-9]/g, '_'));
    return `${type}:${sanitizedParams.join(':')}`;
}

class CacheService {
    private db: IDBDatabase | null = null;
    private dbReady: Promise<boolean>;
    private useLocalStorage: boolean = false;

    constructor() {
        this.dbReady = this.initDB();
    }

    /**
     * Inicializa o IndexedDB
     */
    private async initDB(): Promise<boolean> {
        return new Promise((resolve) => {
            if (typeof indexedDB === 'undefined') {
                console.warn('[Cache] IndexedDB não disponível, usando localStorage como fallback');
                this.useLocalStorage = true;
                resolve(true);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.warn('[Cache] Erro ao abrir IndexedDB, usando localStorage como fallback');
                this.useLocalStorage = true;
                resolve(true);
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                console.log('[Cache] IndexedDB inicializado com sucesso');

                // Limpar entradas expiradas ao inicializar
                this.cleanupExpired();

                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Criar object store se não existir
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    store.createIndex('dateKey', 'dateKey', { unique: false });
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                    console.log('[Cache] Object store criado');
                }
            };
        });
    }

    /**
     * Garante que o DB está pronto antes de qualquer operação
     */
    private async ensureReady(): Promise<void> {
        await this.dbReady;
    }

    /**
     * Armazena dados no cache
     */
    async set<T>(key: string, data: T, type: CacheType = 'default'): Promise<void> {
        await this.ensureReady();

        const now = Date.now();
        const duration = CACHE_DURATIONS[type];
        const entry: CacheEntry<T> = {
            key,
            data,
            timestamp: now,
            expiresAt: now + duration,
            dateKey: getTodayKey(),
        };

        if (this.useLocalStorage) {
            try {
                localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
            } catch (e) {
                console.warn('[Cache] Erro ao salvar no localStorage:', e);
                // Se localStorage estiver cheio, limpar dados antigos
                this.cleanupLocalStorage();
                try {
                    localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
                } catch {
                    console.error('[Cache] Falha ao salvar mesmo após limpeza');
                }
            }
            return;
        }

        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('DB não inicializado'));
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(entry);

            request.onsuccess = () => {
                console.log(`[Cache] Dados salvos: ${key}`);
                resolve();
            };

            request.onerror = () => {
                console.warn(`[Cache] Erro ao salvar: ${key}`);
                reject(request.error);
            };
        });
    }

    /**
     * Recupera dados do cache
     * Retorna null se não existir ou estiver expirado
     */
    async get<T>(key: string): Promise<T | null> {
        await this.ensureReady();

        const now = Date.now();
        const todayKey = getTodayKey();

        if (this.useLocalStorage) {
            try {
                const item = localStorage.getItem(`cache:${key}`);
                if (!item) return null;

                const entry: CacheEntry<T> = JSON.parse(item);

                // Verificar se expirou ou é de um dia diferente
                if (entry.expiresAt < now || entry.dateKey !== todayKey) {
                    localStorage.removeItem(`cache:${key}`);
                    return null;
                }

                console.log(`[Cache] HIT: ${key}`);
                return entry.data;
            } catch {
                return null;
            }
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const entry = request.result as CacheEntry<T> | undefined;

                if (!entry) {
                    console.log(`[Cache] MISS: ${key}`);
                    resolve(null);
                    return;
                }

                // Verificar se expirou ou é de um dia diferente
                if (entry.expiresAt < now || entry.dateKey !== todayKey) {
                    console.log(`[Cache] EXPIRED: ${key}`);
                    this.delete(key); // Limpar entrada expirada
                    resolve(null);
                    return;
                }

                console.log(`[Cache] HIT: ${key}`);
                resolve(entry.data);
            };

            request.onerror = () => {
                console.warn(`[Cache] Erro ao recuperar: ${key}`);
                resolve(null);
            };
        });
    }

    /**
     * Remove uma entrada do cache
     */
    async delete(key: string): Promise<void> {
        await this.ensureReady();

        if (this.useLocalStorage) {
            localStorage.removeItem(`cache:${key}`);
            return;
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(key);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        });
    }

    /**
     * Limpa todo o cache
     */
    async clear(): Promise<void> {
        await this.ensureReady();

        if (this.useLocalStorage) {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('cache:')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            console.log(`[Cache] ${keysToRemove.length} entradas removidas do localStorage`);
            return;
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[Cache] Cache limpo completamente');
                resolve();
            };

            request.onerror = () => {
                console.warn('[Cache] Erro ao limpar cache');
                resolve();
            };
        });
    }

    /**
     * Remove entradas expiradas do IndexedDB
     */
    private async cleanupExpired(): Promise<void> {
        if (this.useLocalStorage || !this.db) return;

        const now = Date.now();
        const todayKey = getTodayKey();

        return new Promise((resolve) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();

            let removedCount = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

                if (cursor) {
                    const entry = cursor.value as CacheEntry<unknown>;

                    // Remover se expirado ou de dia diferente
                    if (entry.expiresAt < now || entry.dateKey !== todayKey) {
                        cursor.delete();
                        removedCount++;
                    }

                    cursor.continue();
                } else {
                    if (removedCount > 0) {
                        console.log(`[Cache] ${removedCount} entradas expiradas removidas`);
                    }
                    resolve();
                }
            };

            request.onerror = () => resolve();
        });
    }

    /**
     * Limpa entradas antigas do localStorage quando estiver cheio
     */
    private cleanupLocalStorage(): void {
        const cacheItems: Array<{ key: string; timestamp: number }> = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('cache:')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key) || '{}');
                    cacheItems.push({ key, timestamp: item.timestamp || 0 });
                } catch {
                    // Item inválido, remover
                    localStorage.removeItem(key);
                }
            }
        }

        // Ordenar por timestamp e remover os 50% mais antigos
        cacheItems.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = Math.ceil(cacheItems.length / 2);

        for (let i = 0; i < toRemove; i++) {
            localStorage.removeItem(cacheItems[i].key);
        }

        console.log(`[Cache] ${toRemove} entradas antigas removidas do localStorage`);
    }

    /**
     * Obtém estatísticas do cache
     */
    async getStats(): Promise<{ totalEntries: number; todayEntries: number; size: string }> {
        await this.ensureReady();

        const todayKey = getTodayKey();

        if (this.useLocalStorage) {
            let total = 0;
            let today = 0;
            let size = 0;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('cache:')) {
                    total++;
                    const item = localStorage.getItem(key) || '';
                    size += item.length * 2; // Aproximado em bytes (UTF-16)

                    try {
                        const entry = JSON.parse(item);
                        if (entry.dateKey === todayKey) today++;
                    } catch {
                        // ignore
                    }
                }
            }

            return {
                totalEntries: total,
                todayEntries: today,
                size: formatBytes(size),
            };
        }

        return new Promise((resolve) => {
            if (!this.db) {
                resolve({ totalEntries: 0, todayEntries: 0, size: '0 B' });
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const countRequest = store.count();

            let total = 0;
            let today = 0;

            countRequest.onsuccess = () => {
                total = countRequest.result;

                // Contar entradas de hoje
                const index = store.index('dateKey');
                const todayRequest = index.count(IDBKeyRange.only(todayKey));

                todayRequest.onsuccess = () => {
                    today = todayRequest.result;
                    resolve({
                        totalEntries: total,
                        todayEntries: today,
                        size: 'N/A (IndexedDB)',
                    });
                };

                todayRequest.onerror = () => {
                    resolve({ totalEntries: total, todayEntries: 0, size: 'N/A' });
                };
            };

            countRequest.onerror = () => {
                resolve({ totalEntries: 0, todayEntries: 0, size: 'Unknown' });
            };
        });
    }
}

/**
 * Formata bytes para string legível
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Singleton instance
export const cacheService = new CacheService();

// Export utilities
export { generateCacheKey, getTodayKey, CACHE_DURATIONS };
export type { CacheType, CacheEntry };
