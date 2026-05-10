-- ============================================================
-- 07_alocadores_tables.sql
-- Extracted from: data/create_allocator_tables.py
-- Schema: alocadores
-- Description: All allocator-specific derived tables:
--   peer dominance, flow calculations, metric deltas
-- ============================================================

CREATE SCHEMA IF NOT EXISTS alocadores;

-- 1. r_amostral_2 (Peer Dominante) — dominant peer per fund
DROP TABLE IF EXISTS alocadores.r_amostral_2 CASCADE;
CREATE TABLE alocadores.r_amostral_2 AS
WITH allocation_per_peer AS (
    SELECT 
        cliente, 
        cnpj_fundo,
        denom_social,
        peer,
        SUM(vl_merc_pos_final) as total_peer
    FROM cvm.carteira
    WHERE dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.carteira)
    GROUP BY cliente, cnpj_fundo, denom_social, peer
),
ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY cnpj_fundo ORDER BY total_peer DESC) as rn
    FROM allocation_per_peer
)
SELECT 
    cliente,
    peer,
    total_peer as vl_merc_pos_final,
    cnpj_fundo,
    denom_social
FROM ranked
WHERE rn = 1;

-- 2. r_apelidos (Sanitization) — cleaned fund names
DROP TABLE IF EXISTS alocadores.r_apelidos CASCADE;
CREATE TABLE alocadores.r_apelidos AS
SELECT 
    cnpj_fundo,
    TRIM(REGEXP_REPLACE(denom_social, '(FUNDO DE INVESTIMENTO|FI|FIM|FIC|MULTIMERCADO|RENDA FIXA|AÇÕES|CAMBIAL|EM COTAS DE FUNDOS DE INVESTIMENTO|CRÉDITO PRIVADO|CP|LP|LONG PRAZO|PARTICIPAÇÕES|FIP|IE|ISENTO|DEBÊNTURES)', '', 'gi')) as apelido
FROM cvm.cadastro;

-- 3. r_carteira — materialized copy of cvm.carteira
DROP TABLE IF EXISTS alocadores.r_carteira CASCADE;
CREATE TABLE alocadores.r_carteira AS SELECT * FROM cvm.carteira;

-- 4. kinea.fundos — filtered fund list for Kinea
CREATE SCHEMA IF NOT EXISTS kinea;
DROP TABLE IF EXISTS kinea.fundos CASCADE;
CREATE TABLE kinea.fundos AS
SELECT cnpj_fundo, denom_social as nome_fundo
FROM cvm.cadastro
WHERE gestor ILIKE '%KINEA%' and dt_fim is null and sit <> 'CANCELADA';

-- 5. r_fundos_kinea_metas (Mock targets)
DROP TABLE IF EXISTS alocadores.r_fundos_kinea_metas CASCADE;
CREATE TABLE alocadores.r_fundos_kinea_metas AS
SELECT 
    cnpj_fundo,
    15.0 as "6",
    25.0 as "12",
    40.0 as "24",
    55.0 as "36",
    70.0 as "48",
    85.0 as "60",
    'IPCA+Yield' as tipo
FROM alocadores.fundos_kinea;

-- 6. r_metrics — metrics enriched with observed months
CREATE TABLE IF NOT EXISTS cvm.metrics (cnpj_fundo VARCHAR, janela INT, ret FLOAT, vol FLOAT, mdd FLOAT, recovery_time FLOAT, sharpe FLOAT, calmar FLOAT, hit_ratio FLOAT, info_ratio FLOAT);
DROP TABLE IF EXISTS alocadores.r_metrics CASCADE;
CREATE TABLE alocadores.r_metrics AS
SELECT 
    m.*,
    id_subclasse,
    DATE_PART('year', AGE(CURRENT_DATE, c.dt_ini)) * 12 + DATE_PART('month', AGE(CURRENT_DATE, c.dt_ini)) as meses_observados
FROM cvm.metrics m
LEFT JOIN cvm.cadastro c ON m.cnpj_fundo = c.cnpj_fundo;

-- 7. r_mov_carteira_gestor_peer — movement (delta value) by client/peer/gestor
DROP TABLE IF EXISTS alocadores.r_mov_carteira_gestor_peer CASCADE;
CREATE TABLE alocadores.r_mov_carteira_gestor_peer AS
WITH agg AS (
    SELECT 
        dt_comptc,
        cliente,
        peer,
        gestor_cota as gestor,
        SUM(vl_merc_pos_final) as valor
    FROM cvm.carteira
    GROUP BY dt_comptc, cliente, peer, gestor_cota
),
lagged AS (
    SELECT 
        *,
        LAG(valor) OVER (PARTITION BY cliente, peer, gestor ORDER BY dt_comptc) as prev_valor
    FROM agg
)
SELECT 
    dt_comptc,
    cliente,
    peer,
    gestor,
    valor,
    (valor - COALESCE(prev_valor, 0)) as delta_valor
FROM lagged;

-- 8. r_fluxo_peer — flow variations for client allocation per peer
DROP TABLE IF EXISTS alocadores.r_fluxo_peer CASCADE;
CREATE TABLE alocadores.r_fluxo_peer AS
WITH monthly AS (
    SELECT 
        cliente,
        peer,
        dt_comptc as dt_ref,
        SUM(vl_merc_pos_final) as vl_ref
    FROM cvm.carteira
    GROUP BY cliente, peer, dt_comptc
)
SELECT 
    m1.cliente, m1.peer, m1.dt_ref, m1.vl_ref,
    m1.vl_ref - m6.vl_ref as delta_6M, (m1.vl_ref - m6.vl_ref) / NULLIF(m6.vl_ref, 0) as pct_6M,
    m1.vl_ref - m12.vl_ref as delta_12M, (m1.vl_ref - m12.vl_ref) / NULLIF(m12.vl_ref, 0) as pct_12M,
    m1.vl_ref - m24.vl_ref as delta_24M, (m1.vl_ref - m24.vl_ref) / NULLIF(m24.vl_ref, 0) as pct_24M,
    m1.vl_ref - m36.vl_ref as delta_36M, (m1.vl_ref - m36.vl_ref) / NULLIF(m36.vl_ref, 0) as pct_36M,
    m1.vl_ref - m48.vl_ref as delta_48M, (m1.vl_ref - m48.vl_ref) / NULLIF(m48.vl_ref, 0) as pct_48M,
    m1.vl_ref - m60.vl_ref as delta_60M, (m1.vl_ref - m60.vl_ref) / NULLIF(m60.vl_ref, 0) as pct_60M
FROM monthly m1
LEFT JOIN monthly m6 ON m1.cliente = m6.cliente AND m1.peer = m6.peer AND m6.dt_ref = (m1.dt_ref - INTERVAL '6 month')::date
LEFT JOIN monthly m12 ON m1.cliente = m12.cliente AND m1.peer = m12.peer AND m12.dt_ref = (m1.dt_ref - INTERVAL '12 month')::date
LEFT JOIN monthly m24 ON m1.cliente = m24.cliente AND m1.peer = m24.peer AND m24.dt_ref = (m1.dt_ref - INTERVAL '24 month')::date
LEFT JOIN monthly m36 ON m1.cliente = m36.cliente AND m1.peer = m36.peer AND m36.dt_ref = (m1.dt_ref - INTERVAL '36 month')::date
LEFT JOIN monthly m48 ON m1.cliente = m48.cliente AND m1.peer = m48.peer AND m48.dt_ref = (m1.dt_ref - INTERVAL '48 month')::date
LEFT JOIN monthly m60 ON m1.cliente = m60.cliente AND m1.peer = m60.peer AND m60.dt_ref = (m1.dt_ref - INTERVAL '60 month')::date;

-- 9. r_var_gestor_cota — PL variation of target fund groups
DROP TABLE IF EXISTS alocadores.r_var_gestor_cota CASCADE;
CREATE TABLE alocadores.r_var_gestor_cota AS
WITH target_funds AS (
    SELECT DISTINCT cda.cnpj_fundo_cota as cnpj_fundo, cda.gestor_cota as grupo
    FROM cvm.carteira cda
),
daily_pl_group AS (
    SELECT 
        tf.grupo as grupo_cota,
        c.dt_comptc as dt_ref,
        SUM(c.vl_patrim_liq) as vl_ref
    FROM cvm.cotas c
    INNER JOIN target_funds tf ON c.cnpj_fundo = tf.cnpj_fundo
    GROUP BY tf.grupo, c.dt_comptc
)
SELECT 
    m1.grupo_cota, m1.dt_ref, m1.vl_ref,
    m1.vl_ref - m6.vl_ref as delta_6M, (m1.vl_ref - m6.vl_ref) / NULLIF(m6.vl_ref, 0) as pct_6M,
    m1.vl_ref - m12.vl_ref as delta_12M, (m1.vl_ref - m12.vl_ref) / NULLIF(m12.vl_ref, 0) as pct_12M,
    m1.vl_ref - m24.vl_ref as delta_24M, (m1.vl_ref - m24.vl_ref) / NULLIF(m24.vl_ref, 0) as pct_24M,
    m1.vl_ref - m36.vl_ref as delta_36M, (m1.vl_ref - m36.vl_ref) / NULLIF(m36.vl_ref, 0) as pct_36M,
    m1.vl_ref - m48.vl_ref as delta_48M, (m1.vl_ref - m48.vl_ref) / NULLIF(m48.vl_ref, 0) as pct_48M,
    m1.vl_ref - m60.vl_ref as delta_60M, (m1.vl_ref - m60.vl_ref) / NULLIF(m60.vl_ref, 0) as pct_60M
FROM daily_pl_group m1
LEFT JOIN daily_pl_group m6 ON m1.grupo_cota = m6.grupo_cota AND m6.dt_ref = (m1.dt_ref - INTERVAL '6 month')::date
LEFT JOIN daily_pl_group m12 ON m1.grupo_cota = m12.grupo_cota AND m12.dt_ref = (m1.dt_ref - INTERVAL '12 month')::date
LEFT JOIN daily_pl_group m24 ON m1.grupo_cota = m24.grupo_cota AND m24.dt_ref = (m1.dt_ref - INTERVAL '24 month')::date
LEFT JOIN daily_pl_group m36 ON m1.grupo_cota = m36.grupo_cota AND m36.dt_ref = (m1.dt_ref - INTERVAL '36 month')::date
LEFT JOIN daily_pl_group m48 ON m1.grupo_cota = m48.grupo_cota AND m48.dt_ref = (m1.dt_ref - INTERVAL '48 month')::date
LEFT JOIN daily_pl_group m60 ON m1.grupo_cota = m60.grupo_cota AND m60.dt_ref = (m1.dt_ref - INTERVAL '60 month')::date;

-- 10. r_var_nm_fundo_cota — PL variation by fund name/CNPJ
DROP TABLE IF EXISTS alocadores.r_var_nm_fundo_cota CASCADE;
CREATE TABLE alocadores.r_var_nm_fundo_cota AS
WITH target_funds AS (
    SELECT DISTINCT cnpj_fundo_cota as cnpj_fundo, nm_fundo_cota
    FROM cvm.carteira
),
daily_pl_fund AS (
    SELECT 
        tf.nm_fundo_cota,
        tf.cnpj_fundo as cnpj_fundo_cota,
        c.dt_comptc as dt_ref,
        c.vl_patrim_liq as vl_ref
    FROM cvm.cotas c
    INNER JOIN target_funds tf ON c.cnpj_fundo = tf.cnpj_fundo
)
SELECT 
    m1.nm_fundo_cota, m1.cnpj_fundo_cota, m1.dt_ref, m1.vl_ref,
    m1.vl_ref - m6.vl_ref as delta_6M, (m1.vl_ref - m6.vl_ref) / NULLIF(m6.vl_ref, 0) as pct_6M,
    m1.vl_ref - m12.vl_ref as delta_12M, (m1.vl_ref - m12.vl_ref) / NULLIF(m12.vl_ref, 0) as pct_12M,
    m1.vl_ref - m24.vl_ref as delta_24M, (m1.vl_ref - m24.vl_ref) / NULLIF(m24.vl_ref, 0) as pct_24M,
    m1.vl_ref - m36.vl_ref as delta_36M, (m1.vl_ref - m36.vl_ref) / NULLIF(m36.vl_ref, 0) as pct_36M,
    m1.vl_ref - m48.vl_ref as delta_48M, (m1.vl_ref - m48.vl_ref) / NULLIF(m48.vl_ref, 0) as pct_48M,
    m1.vl_ref - m60.vl_ref as delta_60M, (m1.vl_ref - m60.vl_ref) / NULLIF(m60.vl_ref, 0) as pct_60M
FROM daily_pl_fund m1
LEFT JOIN daily_pl_fund m6 ON m1.cnpj_fundo_cota = m6.cnpj_fundo_cota AND m6.dt_ref = (m1.dt_ref - INTERVAL '6 month')::date
LEFT JOIN daily_pl_fund m12 ON m1.cnpj_fundo_cota = m12.cnpj_fundo_cota AND m12.dt_ref = (m1.dt_ref - INTERVAL '12 month')::date
LEFT JOIN daily_pl_fund m24 ON m1.cnpj_fundo_cota = m24.cnpj_fundo_cota AND m24.dt_ref = (m1.dt_ref - INTERVAL '24 month')::date
LEFT JOIN daily_pl_fund m36 ON m1.cnpj_fundo_cota = m36.cnpj_fundo_cota AND m36.dt_ref = (m1.dt_ref - INTERVAL '36 month')::date
LEFT JOIN daily_pl_fund m48 ON m1.cnpj_fundo_cota = m48.cnpj_fundo_cota AND m48.dt_ref = (m1.dt_ref - INTERVAL '48 month')::date
LEFT JOIN daily_pl_fund m60 ON m1.cnpj_fundo_cota = m60.cnpj_fundo_cota AND m60.dt_ref = (m1.dt_ref - INTERVAL '60 month')::date;
