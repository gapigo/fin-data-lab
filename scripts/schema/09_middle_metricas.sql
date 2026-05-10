-- ============================================================
-- 09_middle_metricas.sql
-- Extracted from: data/project_metrics.ipynb, data/project_metrics2.py
-- Schema: middle
-- Description: Rolling performance metrics for all funds,
--   computed via Python (numpy vectorized) at 6 windows.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS middle;

-- The fundos_metricas_175 table is populated by Python scripts
-- (data/project_metrics.ipynb, data/project_metrics2.py) which:
--
-- 1. Load cvm.cotas (quota data from 2014-06-01)
-- 2. Remove duplicates on (dt_comptc, cnpj_fundo, id_subclasse)
-- 3. Pivot to matrix: index=date, columns=fund, values=quota
-- 4. Compute log returns: returns = log(matrix / matrix.shift(1))
-- 5. For each month-end date, compute rolling metrics at:
--    6M (126d), 12M (252d), 24M (504d), 36M (756d), 48M (1008d), 60M (1260d)
-- 6. Metrics per window:
--    - ret: cumulative return (exp(sum(log_returns)) - 1)
--    - vol: std(log_returns) * sqrt(252)
--    - mdd: max drawdown (min of cumulative drawdown series)
--    - sharpe: (ret - rf) / vol  (rf = CDINI accumulated return)
--    - sortino: (ret - rf) / downside_std
--    - calmar: ret / |mdd|
--    - es: 5th percentile of returns (expected shortfall)
--    - hit_ratio: fraction of positive returns
--    - info_ratio: (ret - benchmark_ret) / vol (benchmark = IBOV for Ações, CDINI otherwise)
--    - recovery_time: avg days to recover from drawdowns
-- 7. Filter by fund age (must exist before reference date)
-- 8. Join classe from cvm.fi_cad_fi_hist_classe for info_ratio calculation
--
-- Target schema:
CREATE TABLE IF NOT EXISTS middle.fundos_metricas_175 (
    cnpj_fundo VARCHAR,
    id_subclasse VARCHAR,
    dt_comptc DATE,
    janela VARCHAR,       -- '6M', '12M', '24M', '36M', '48M', '60M'
    ret FLOAT,
    vol FLOAT,
    mdd FLOAT,
    sharpe FLOAT,
    sortino FLOAT,
    calmar FLOAT,
    es FLOAT,
    hit_ratio FLOAT,
    meses_observados FLOAT,
    info_ratio FLOAT,
    classe VARCHAR
);
CREATE INDEX IF NOT EXISTS idx_metricas_175 ON middle.fundos_metricas_175 (cnpj_fundo, id_subclasse, dt_comptc, janela);
