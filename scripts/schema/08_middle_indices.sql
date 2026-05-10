-- ============================================================
-- 08_middle_indices.sql
-- Extracted from: data/indices_cotas.py, data/project_metrics.ipynb
-- Schema: middle
-- Description: Index time series for benchmarks (CDI, IBOV,
--   DOLAR, IPCA). Built from external sources via Python scripts.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS middle;

-- The indices_cotas table is populated by Python scripts
-- (data/indices_cotas.py, data/project_metrics.ipynb) which:
--
-- 1. CDI: Download BCB SGS series 12 via bcb.sgs.get() or JSON API
--    (https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json)
--    Computes accumulated quota: valor = (1 + valor/100).cumprod()
--
-- 2. IBOV: Download from Yahoo Finance (^BVSP)
--    Uses yfinance, Adj Close column
--
-- 3. USD/BRL: Download from Yahoo Finance (BRL=X)
--    Uses yfinance, Adj Close column
--
-- 4. IPCA: Download BCB SGS series 433, project daily:
--    valor = ((1 + taxa/100)^(1/30)).cumprod()
--
-- Target schema:
CREATE TABLE IF NOT EXISTS middle.indices_cotas (
    codigo VARCHAR,    -- 'CDINI', 'IBOV', 'DOLAR_VENDA', 'IPCADIANI'
    valor FLOAT,        -- accumulated index value
    data DATE           -- date
);
CREATE INDEX IF NOT EXISTS idx_indices_cotas ON middle.indices_cotas (data, codigo);
