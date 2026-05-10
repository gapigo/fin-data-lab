-- ============================================================
-- 02_cvm_cotas.sql
-- Extracted from: data/montar_views.ipynb
-- Schema: cvm
-- Description: Materialized view for daily fund quota data
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS cvm.cotas CASCADE;

CREATE MATERIALIZED VIEW cvm.cotas AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) cnpj_fundo, DATE(dt_comptc) dt_comptc, vl_total, vl_quota, vl_patrim_liq, captc_dia, resg_dia, nr_cotst, id_subclasse
FROM cvm.fi_doc_inf_diario_inf_diario_fi;
