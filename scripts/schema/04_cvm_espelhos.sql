-- ============================================================
-- 04_cvm_espelhos.sql
-- Extracted from: data/montar_views.ipynb
-- Schema: cvm
-- Description: Mirror/feeder fund detection using recursive
--   CTE — identifies master-feeder relationships where a fund
--   invests >90% of PL into another fund.
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS cvm.espelhos CASCADE;

CREATE MATERIALIZED VIEW cvm.espelhos AS
WITH 
cotas AS (
    -- Substitute for GROUP BY MONTH/YEAR using DATE_TRUNC
    SELECT 
        cnpj_fundo, 
        MAX(dt_comptc::text::date) AS dt_comptc, -- Gets the last date of the month
        MAX(vl_patrim_liq) AS vl_patrim_liq      -- Gets the PL for that day
    FROM cvm.cda_fi_pl
    WHERE dt_comptc::text::date >= CURRENT_DATE - INTERVAL '1 year'
    GROUP BY 
        cnpj_fundo, 
        DATE_TRUNC('month', dt_comptc::text::date) -- Group by month/year
),
carteiras_fechadas AS (
    SELECT 
        cnpj_fundo, 
        MIN(dt_comptc::text::date) AS dt_comptc 
    FROM cvm.cda_fi_confid 
    WHERE dt_confid_aplic::text::date > CURRENT_DATE 
    GROUP BY cnpj_fundo
),
carteiras_abertas AS (
    SELECT cda.* FROM cvm.cda_fi_blc_2 cda
    INNER JOIN carteiras_fechadas cf 
        ON cda.cnpj_fundo = cf.cnpj_fundo 
        AND cda.dt_comptc::text::date < cf.dt_comptc
    UNION 
    SELECT * FROM cvm.cda_fi_blc_2 
    WHERE cnpj_fundo NOT IN (SELECT cnpj_fundo FROM carteiras_fechadas)
),
ultima_aberta AS (
    SELECT ca.* FROM carteiras_abertas ca
    INNER JOIN (
        SELECT cnpj_fundo, MAX(dt_comptc::text::date) AS dt_comptc 
        FROM carteiras_abertas 
        GROUP BY cnpj_fundo
    ) max_carteira
    ON max_carteira.dt_comptc = ca.dt_comptc::text::date 
    AND max_carteira.cnpj_fundo = ca.cnpj_fundo
),
pct_pl AS (
    SELECT 
        ua.cnpj_fundo, 
        ua.cnpj_fundo_cota, 
        (ua.vl_merc_pos_final / NULLIF(c.vl_patrim_liq, 0)) AS pct, 
        ua.dt_comptc 
    FROM ultima_aberta ua
    INNER JOIN cotas c ON c.cnpj_fundo = ua.cnpj_fundo 
    AND DATE_TRUNC('month', c.dt_comptc) = DATE_TRUNC('month', ua.dt_comptc::text::date)
),
espelhos AS ( 
    SELECT cnpj_fundo, cnpj_fundo_cota 
    FROM pct_pl 
    WHERE pct > 0.9
),
consolidada AS (
    SELECT 
        e1.cnpj_fundo, 
        COALESCE(e4.cnpj_fundo_cota, e3.cnpj_fundo_cota, e2.cnpj_fundo_cota, e1.cnpj_fundo_cota) AS cnpj_fundo_cota
    FROM espelhos e1
    LEFT JOIN espelhos e2 ON e2.cnpj_fundo = e1.cnpj_fundo_cota
    LEFT JOIN espelhos e3 ON e3.cnpj_fundo = e2.cnpj_fundo_cota
    LEFT JOIN espelhos e4 ON e4.cnpj_fundo = e3.cnpj_fundo_cota
)
SELECT * FROM consolidada;
