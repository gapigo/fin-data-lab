-- ============================================================
-- 05_cvm_ativos_carteira.sql
-- Extracted from: data/update_complex_views.py, data/montar_views.ipynb
-- Schema: cvm
-- Description: Unified portfolio holdings view combining
--   BLC blocks 1-8 into a single materialized view.
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS cvm.ativos_carteira CASCADE;

CREATE MATERIALIZED VIEW cvm.ativos_carteira AS
    SELECT 'blc_1' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cd_isin cd_ativo, 'ISIN' tp_cd_ativo, tp_titpub nm_ativo FROM cvm.cda_fi_blc_1
UNION SELECT 'blc_2' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cnpj_fundo_cota cd_ativo, 'CNPJ' tp_cd_ativo, nm_fundo_cota nm_ativo FROM cvm.cda_fi_blc_2
UNION SELECT 'blc_3' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cd_swap cd_ativo, 'SWAP' tp_cd_ativo, ds_swap nm_ativo FROM cvm.cda_fi_blc_3
UNION SELECT 'blc_4' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cd_ativo, 'TICKER' tp_cd_ativo, ds_ativo nm_ativo FROM cvm.cda_fi_blc_4
UNION SELECT 'blc_5' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cnpj_emissor cd_ativo, 'CNPJ' tp_cd_ativo, CONCAT(tp_ativo, ' - ', emissor, ' - ') nm_ativo FROM cvm.cda_fi_blc_5
UNION SELECT 'blc_6' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cpf_cnpj_emissor cd_ativo, 'CNPJ' tp_cd_ativo, CONCAT(tp_ativo, ' - ', emissor, ' - ', cd_indexador_posfx, ' - ', ds_indexador_posfx) nm_ativo FROM cvm.cda_fi_blc_6
UNION SELECT 'blc_7' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, CONCAT(cd_pais, ' - ', cd_bv_merc, ' - ', cd_ativo_bv_merc) cd_ativo, 'PAIS - BOLSA - CODIGO' tp_cd_ativo, emissor nm_ativo FROM cvm.cda_fi_blc_7
UNION SELECT 'blc_8' bloco, tp_fundo, cnpj_fundo, dt_comptc, tp_aplic, tp_ativo, qt_pos_final, vl_merc_pos_final, cpf_cnpj_emissor cd_ativo, CASE WHEN cpf_cnpj_emissor IS NULL THEN NULL ELSE 'CNPJ' END AS tp_cd_ativo, CASE WHEN cpf_cnpj_emissor IS NOT NULL THEN CONCAT(ds_ativo, ' - ', emissor) ELSE ds_ativo END AS nm_ativo FROM cvm.cda_fi_blc_8;
