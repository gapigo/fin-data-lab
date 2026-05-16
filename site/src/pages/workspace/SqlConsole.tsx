import { useState, useEffect, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { defaultKeymap } from '@codemirror/commands';
import { useRef } from 'react';
import { Play, Save, Download, History, ChevronRight, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SchemaInfo {
  [schema: string]: {
    [table: string]: { name: string; type: string }[];
  };
}

export default function SqlConsole() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [query, setQuery] = useState('SELECT * FROM cvm.cotas LIMIT 10');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<SchemaInfo>({});
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!editorRef.current) return;
    const state = EditorState.create({
      doc: query,
      extensions: [
        basicSetup,
        sql(),
        oneDark,
        keymap.of([indentWithTab, ...defaultKeymap]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            setQuery(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' },
          '.cm-content': { fontFamily: 'var(--font-mono)' }
        })
      ]
    });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    return () => { viewRef.current?.destroy(); };
  }, []);

  useEffect(() => {
    fetch('/api/sql/schema').then(r => r.json()).then(setSchema);
    fetch('/api/sql/history').then(r => r.json()).then(setHistory);
  }, []);

  const execute = useCallback(async () => {
    const q = viewRef.current?.state.doc.toString() || query;
    setLoading(true);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 1000 })
      });
      const data = await res.json();
      setResults(data);
      // refresh history
      fetch('/api/sql/history').then(r => r.json()).then(setHistory);
    } catch (e) {
      setResults({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        execute();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const q = viewRef.current?.state.doc.toString() || query;
        const name = prompt('Nome da query:');
        if (name) {
          fetch('/api/sql/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: '', query: q })
          });
        }
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowHistory(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [execute, query]);

  const toggleSchema = (s: string) => {
    setExpandedSchemas(prev => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  };

  const toggleTable = (t: string) => {
    setExpandedTables(prev => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  };

  const exportCSV = () => {
    if (!results || !results.rows) return;
    const header = results.columns.join(',');
    const rows = results.rows.map((r: any[]) => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_result.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-var(--header-height))] flex flex-col bg-[var(--bg-primary)]">
      <div className="flex flex-1 min-h-0">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Database size={16} className="text-[var(--accent-primary)]" />
              SQL Console
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={execute} disabled={loading} className="text-xs">
                <Play size={14} className="mr-1" /> Run ⌘↵
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowHistory(v => !v)} className="text-xs">
                <History size={14} className="mr-1" /> Histórico
              </Button>
              <Button size="sm" variant="ghost" onClick={exportCSV} disabled={!results?.rows} className="text-xs">
                <Download size={14} className="mr-1" /> CSV
              </Button>
            </div>
          </div>

          {showHistory && (
            <div className="h-40 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-y-auto p-2">
              {history.length === 0 && <p className="text-xs text-[var(--text-muted)]">Nenhum histórico</p>}
              {history.map((h: any) => (
                <button
                  key={h.id}
                  onClick={() => viewRef.current?.dispatch({ changes: { from: 0, to: viewRef.current.state.doc.length, insert: h.query } })}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] truncate"
                >
                  {h.query} · {h.row_count} rows · {h.execution_time_ms}ms
                </button>
              ))}
            </div>
          )}

          <div ref={editorRef} className="flex-1 min-h-0 overflow-auto" />
        </div>

        {/* Right: Schema */}
        <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Schema</h3>
          {Object.entries(schema).map(([sName, tables]) => (
            <div key={sName} className="mb-1">
              <button
                onClick={() => toggleSchema(sName)}
                className="flex items-center gap-1 w-full text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded px-1 py-0.5"
              >
                <ChevronRight size={12} className={`transition-transform ${expandedSchemas.has(sName) ? 'rotate-90' : ''}`} />
                {sName} ({Object.keys(tables).length} tables)
              </button>
              {expandedSchemas.has(sName) && (
                <div className="ml-4">
                  {Object.entries(tables).map(([tName, cols]) => (
                    <div key={tName}>
                      <button
                        onClick={() => toggleTable(`${sName}.${tName}`)}
                        className="flex items-center gap-1 w-full text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded px-1 py-0.5"
                      >
                        <ChevronRight size={10} className={`transition-transform ${expandedTables.has(`${sName}.${tName}`) ? 'rotate-90' : ''}`} />
                        {tName}
                      </button>
                      {expandedTables.has(`${sName}.${tName}`) && (
                        <div className="ml-3 space-y-0.5">
                          {cols.map(c => (
                            <div key={c.name} className="text-[10px] text-[var(--text-muted)] flex justify-between">
                              <span>{c.name}</span>
                              <span>{c.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Results */}
      <div className="h-72 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-muted)]">
            {results?.row_count !== undefined ? `${results.row_count} rows · ${results.execution_time_ms || 0}ms` : 'Resultados'}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          {results?.columns && (
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-primary)] sticky top-0">
                <tr>
                  {results.columns.map((c: string) => (
                    <th key={c} className="text-left px-2 py-1 font-medium text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row: any[], i: number) => (
                  <tr key={i} className="hover:bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
                    {row.map((cell: any, j: number) => (
                      <td key={j} className="px-2 py-1 text-[var(--text-primary)] whitespace-nowrap">{String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results?.error && (
            <div className="p-4 text-sm text-[var(--negative)]">{results.error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
