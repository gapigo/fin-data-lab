# Fin·Data·Lab Comprehensive Audit — Fix Tracker

## Backend Fixes

### 1. `config/postgresql.py` — `read_sql()` params support
- **Issue**: `pd.read_sql()` couldn't handle SQLAlchemy named parameters (`:cnpj`)
- **Fix**: Added `params: dict = None` parameter and passed it to `pd.read_sql()`
- **Verification**: ✅ Graph endpoint now queries successfully with parameters

### 2. `api/routers/funds.py` — `get_fund_graph` endpoint (3 bugs)
- **Issue 1 (CNPJ format)**: Endpoint stripped formatting from CNPJ, but `cvm.cda_fi_blc_2` stores formatted CNPJs (`21.624.757/0001-26`)
- **Fix 1**: Changed `cnpj.replace(...)` to `BaseRepository.normalize_cnpj(cnpj)`
- **Issue 2 (Column names)**: SQL used `cnpj_fundo_invest`/`nm_fundo_invest` but table has `cnpj_fundo_cota`/`nm_fundo_cota`
- **Fix 2**: Updated column names in SQL query
- **Issue 3 (Missing column)**: `c.classe_ativo` doesn't exist in `cvm.cadastro`; correct column is `classe`
- **Fix 3**: Changed `c.classe_ativo` to `c.classe`
- **Issue 4 (Duplicates)**: Same target fund appeared multiple times across asset subclasses
- **Fix 4**: Added `GROUP BY` + `SUM(vl_merc_pos_final)` + `MAX()` for deduplication
- **Verification**: ✅ `/funds/21624757000126/graph` returns 7 nodes, 6 links

### 3. `api/routers/ai.py` — AI chat error handling
- **Issue**: Anthropic 401 error crashed ASGI app with unhandled `AuthenticationError`
- **Fix**: Added `try/except` in SSE stream generator; catches `AuthenticationError` and `Exception`
- **Fix**: Changed placeholder key check from `if api_key` to `if api_key and api_key != "your_key_here"`
- **Verification**: ✅ Endpoint returns 200 OK with graceful error message via SSE

## Frontend Fixes

### 4. `site/src/pages/FundLab.tsx` — Crash prevention
- **Issue**: `Cannot read properties of undefined (reading 'taxa_adm')` white-screen crash
- **Fix**: Applied optional chaining (`fund?.prop`) on ~20 property accesses
- **Verification**: ✅ Fund Lab loads for all tested CNPJs

### 5. `site/src/pages/FundLab.tsx` — Dark color bleed eliminated
- **Issue**: Hardcoded Tailwind dark colors (`bg-slate-900`, `text-white`, `text-emerald-400`, etc.) invisible on light background
- **Fix**: Replaced all hardcoded dark colors with CSS variables per DESIGN.md
  - Hero cards: `bg-slate-900/50` → `bg-[var(--bg-elevated)]`
  - Tab bar: `bg-slate-900/80` → `bg-[var(--bg-secondary)]`
  - Fund name: gradient text → `text-[var(--text-primary)]`
  - All `text-white` → `text-[var(--text-primary)]`
  - All `text-slate-500` → `text-[var(--text-muted)]`
  - All `text-emerald-400` → `text-[var(--positive)]`
  - All `text-rose-400` → `text-[var(--negative)]`
  - AI panel: `bg-slate-950` → `bg-[var(--bg-secondary)]`
  - Dialog: `bg-slate-900` → `bg-[var(--bg-elevated)]`
- **Verification**: ✅ All 5 tabs render correctly in light mode

### 6. `site/src/pages/Ingestion.tsx` — Dark color bleed eliminated
- **Issue**: Entire page used `bg-[#151520]` dark purple background
- **Fix**: Replaced all hardcoded dark colors with CSS variables
  - Page root: `bg-[#151520]` → `bg-[var(--bg-primary)]`
  - Header: `bg-[#151520]/80 border-gray-800` → `bg-[var(--bg-primary)]/80 border-[var(--border-subtle)]`
  - Cards: `bg-[#1e1e2d] border-gray-700/50` → `bg-[var(--bg-secondary)] border-[var(--border-subtle)]`
  - Button: `bg-blue-600` → `bg-[var(--accent-primary)]`
  - Terminal: `bg-[#0d0d1a]` → `bg-[var(--bg-sunken)]`
  - All `text-gray-400` → `text-[var(--text-muted)]`
  - Log colors: `text-red-400/emerald-400/yellow-400` → CSS variable equivalents
- **Verification**: ✅ Ingestion page renders in light mode with all data visible

### 7. `site/src/pages/workspace/NotebooksPlaceholder.tsx` — Missing layout shell
- **Issue**: Bare placeholder without sidebar/header
- **Fix**: Added `DashboardHeader` and `DashboardSidebar` with state management
- **Verification**: ✅ Notebooks page now has full layout shell

## Verified Pages (Screenshots)

| Page | Route | Status |
|------|-------|--------|
| Home | `/` | ✅ Light mode, 105.160 fundos, search works |
| Fund Lab | `/cvm/lab/:cnpj` | ✅ All 5 tabs work, graph renders, no crashes |
| SQL Console | `/workspace/sql` | ✅ Query executes in 10ms, schema visible |
| AI Panel | Fund Lab AI tab | ✅ Chat UI renders, graceful fallback for no API key |
| Ingestão | `/ingestion` | ✅ Data loads, history table visible, light mode |
| Radar | `/cvm/radar` | ✅ 13 anomalies detected, light mode |
| Notebooks | `/workspace/notebooks` | ✅ Layout shell with sidebar/header |
| Search | Command palette | ✅ Real-time fund search, 8 results for "kinea" |
