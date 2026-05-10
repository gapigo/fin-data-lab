-- ============================================================
-- 01_cvm_raw_views.sql
-- Extracted from: data/montar_views.ipynb
-- Schema: cvm
-- Description: Wrapper views over raw CVM FI tables (BLC 1-8, FIE, FIIM, etc.)
-- ============================================================

CREATE VIEW cvm.cda_fie AS
SELECT tp_fundo_classe AS tp_fundo, cnpj_fundo_classe AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, vl_patrim_liq, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, cd_ativo, ds_ativo, DATE(dt_venc) dt_venc, pf_pj_emissor, cpf_cnpj_emissor, emissor, risco_emissor, cd_selic, DATE(dt_ini_vigencia) dt_ini_vigencia, cd_pais, pais, cd_bv_merc, bv_merc
FROM cvm.fi_doc_cda_fie;

CREATE VIEW cvm.cda_fie_confid AS
SELECT tp_fundo_classe AS tp_fundo, cnpj_fundo_classe AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, vl_venda_negoc, vl_aquis_negoc, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic
FROM cvm.fi_doc_cda_fie_confid;

CREATE VIEW cvm.cda_fiim AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, vl_patrim_liq, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, cd_ativo, ds_ativo, DATE(dt_venc) dt_venc, pf_pj_emissor, cpf_cnpj_emissor, emissor, risco_emissor, cd_selic, DATE(dt_ini_vigencia) dt_ini_vigencia, cd_pais, pais, cd_bv_merc, bv_merc
FROM cvm.fi_doc_cda_fiim;

CREATE VIEW cvm.cda_fiim_confid AS
SELECT tp_fundo_classe AS tp_fundo, cnpj_fundo_classe AS cnpj_fundo, denom_social, (dt_comptc::text)::date dt_comptc, tp_aplic, vl_venda_negoc, vl_aquis_negoc, vl_merc_pos_final, vl_custo_pos_final, (dt_confid_aplic::text)::date dt_confid_aplic
FROM cvm.fi_doc_cda_fiim_confid;

CREATE VIEW cvm.cda_fi_blc_1 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, tp_titpub, cd_isin, cd_selic, dt_emissao, DATE(dt_venc) dt_venc
FROM cvm.fi_doc_cda_fi_blc_1;

CREATE VIEW cvm.cda_fi_blc_2 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) cnpj_fundo, denom_social, dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, dt_confid_aplic, COALESCE(cnpj_fundo_cota, cnpj_fundo_classe_cota) cnpj_fundo_cota, COALESCE(nm_fundo_cota, nm_fundo_classe_subclasse_cota) nm_fundo_cota, id_subclasse
FROM cvm.fi_doc_cda_fi_blc_2;

CREATE VIEW cvm.cda_fi_blc_3 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, cd_swap, ds_swap
FROM cvm.fi_doc_cda_fi_blc_3;

CREATE VIEW cvm.cda_fi_blc_4 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, cd_ativo, ds_ativo, cd_isin, DATE(dt_ini_vigencia) dt_ini_vigencia, DATE(dt_fim_vigencia) dt_fim_vigencia
FROM cvm.fi_doc_cda_fi_blc_4;

CREATE VIEW cvm.cda_fi_blc_5 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, cnpj_emissor, emissor, DATE(dt_venc) dt_venc, titulo_posfx, cd_indexador_posfx, ds_indexador_posfx, pr_indexador_posfx, pr_cupom_posfx, pr_taxa_prefx, risco_emissor, ag_risco, DATE(dt_risco) dt_risco, grau_risco
FROM cvm.fi_doc_cda_fi_blc_5;

CREATE VIEW cvm.cda_fi_blc_6 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, pf_pj_emissor, cpf_cnpj_emissor, emissor, DATE(dt_venc) dt_venc, titulo_posfx, cd_indexador_posfx, ds_indexador_posfx, pr_indexador_posfx, pr_cupom_posfx, pr_taxa_prefx, titulo_cetip, titulo_garantia, cnpj_instituicao_financ_coobr
FROM cvm.fi_doc_cda_fi_blc_6;

CREATE VIEW cvm.cda_fi_blc_7 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, invest_coletivo, invest_coletivo_gestor, emissor, DATE(dt_venc) dt_venc, cd_pais, pais, cd_bv_merc, bv_merc, cd_ativo_bv_merc, risco_emissor, ag_risco, DATE(dt_risco) dt_risco, grau_risco, ds_ativo_exterior, qt_ativo_exterior, vl_ativo_exterior
FROM cvm.fi_doc_cda_fi_blc_7;

CREATE VIEW cvm.cda_fi_blc_8 AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, tp_ativo, emissor_ligado, tp_negoc, qt_venda_negoc, vl_venda_negoc, qt_aquis_negoc, vl_aquis_negoc, qt_pos_final, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic, ds_ativo, pf_pj_emissor, cpf_cnpj_emissor, emissor
FROM cvm.fi_doc_cda_fi_blc_8;

CREATE VIEW cvm.cda_fi_confid AS
SELECT tp_fundo_classe AS tp_fundo, cnpj_fundo_classe AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, tp_aplic, vl_venda_negoc, vl_aquis_negoc, vl_merc_pos_final, vl_custo_pos_final, DATE(dt_confid_aplic) dt_confid_aplic
FROM cvm.fi_doc_cda_fi_confid;

CREATE VIEW cvm.cda_fi_pl AS
SELECT COALESCE(tp_fundo, tp_fundo_classe) AS tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) AS cnpj_fundo, denom_social, DATE(dt_comptc) dt_comptc, vl_patrim_liq
FROM cvm.fi_doc_cda_fi_pl;
