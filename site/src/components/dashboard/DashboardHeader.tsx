import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Settings, Sun, Moon, Search, Command, Bot } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

interface SearchResult {
  cnpj_fundo: string;
  denom_social: string;
  gestor?: string;
  classe?: string;
}

export const DashboardHeader = ({
  onToggleSidebar,
  sidebarCollapsed,
}: DashboardHeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchFocused(true);
      }
      if (!searchFocused) return;
      if (e.key === 'Escape') {
        setSearchFocused(false);
        inputRef.current?.blur();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          setSearchFocused(false);
          setQuery('');
          setResults([]);
          navigate(`/cvm/lab/${selected.cnpj_fundo}`);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchFocused, results, selectedIndex, navigate]);

  const handleSelect = (result: SearchResult) => {
    setSearchFocused(false);
    setQuery('');
    setResults([]);
    navigate(`/cvm/lab/${result.cnpj_fundo}`);
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
        style={{ height: 'var(--header-height)' }}
      >
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors mr-3"
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <Menu size={20} />
        </button>

        {/* Wordmark */}
        <div className="flex items-center gap-2 mr-6 shrink-0">
          <img src="/src/assets/logo.svg" alt="FDL" className="w-6 h-6" />
          <span
            className="hidden md:inline text-lg font-medium text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Fin·Data·Lab
          </span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150',
              searchFocused
                ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)] shadow-sm ring-1 ring-[var(--accent-border)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-sunken)] hover:border-[var(--border-default)]'
            )}
          >
            <Search size={16} className="text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar fundos, ações, crypto..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                // Delay to allow click on result
                setTimeout(() => setSearchFocused(false), 150);
              }}
            />
            <span className="hidden sm:flex items-center gap-0.5 text-[var(--text-muted)] text-xs shrink-0">
              <Command size={12} />
              <span>K</span>
            </span>
          </div>

          {/* Command palette overlay */}
          {searchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-lg p-2 z-50">
              {loading && (
                <p className="text-xs text-[var(--text-muted)] px-3 py-2">Buscando...</p>
              )}
              {!loading && results.length === 0 && query.length >= 2 && (
                <p className="text-xs text-[var(--text-muted)] px-3 py-2">Nenhum resultado encontrado</p>
              )}
              {!loading && results.length === 0 && query.length < 2 && (
                <p className="text-xs text-[var(--text-muted)] px-3 py-2 mb-1">Busque por nome, CNPJ ou ticker</p>
              )}
              <div className="space-y-0.5">
                {results.map((r, i) => (
                  <button
                    key={r.cnpj_fundo}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(r);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors',
                      i === selectedIndex
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    )}
                  >
                    <span className="text-[var(--text-muted)] text-xs font-medium shrink-0">[CVM]</span>
                    <span className="truncate">{r.denom_social}</span>
                    <span className="text-[var(--text-muted)] text-xs ml-auto shrink-0">{r.cnpj_fundo}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <button
            className="relative flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Notificações"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--negative)]" />
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Configurações"
          >
            <Settings size={18} />
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('fdl-ai-open'))}
            className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="AI Analyst"
          >
            <Bot size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div style={{ height: 'var(--header-height)' }} />
    </>
  );
};
