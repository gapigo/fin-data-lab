-- ============================================================
-- 10_indexes.sql
-- Extracted from: data/create_indexes.py
-- Schema: cvm, middle
-- Description: Performance indexes on CVM raw tables and
--   derived tables/views.
-- ============================================================

-- === CVM Raw Tables ===
-- BLC tables (cnpj_fundo, dt_comptc)
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_1_cnpj_dt ON cvm.fi_doc_cda_fi_blc_1 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_2_cnpj_dt ON cvm.fi_doc_cda_fi_blc_2 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_3_cnpj_dt ON cvm.fi_doc_cda_fi_blc_3 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_4_cnpj_dt ON cvm.fi_doc_cda_fi_blc_4 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_5_cnpj_dt ON cvm.fi_doc_cda_fi_blc_5 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_6_cnpj_dt ON cvm.fi_doc_cda_fi_blc_6 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_7_cnpj_dt ON cvm.fi_doc_cda_fi_blc_7 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_8_cnpj_dt ON cvm.fi_doc_cda_fi_blc_8 (cnpj_fundo, dt_comptc);
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_pl_cnpj_dt ON cvm.fi_doc_cda_fi_pl (cnpj_fundo, dt_comptc);

-- BLC 2 reverse index (who invests in me — cnpj_fundo_cota lookup)
CREATE INDEX IF NOT EXISTS idx_fi_doc_cda_fi_blc_2_inv ON cvm.fi_doc_cda_fi_blc_2 (cnpj_fundo_cota, dt_comptc);

-- === CVM Cotas ===
CREATE INDEX IF NOT EXISTS idx_fi_doc_inf_diario_inf_diario_fi_cnpj_dt ON cvm.fi_doc_inf_diario_inf_diario_fi (cnpj_fundo, dt_comptc);

-- === CVM Cadastro ===
CREATE INDEX IF NOT EXISTS idx_cadastro_cnpj ON cvm.cadastro (cnpj_fundo);
CREATE INDEX IF NOT EXISTS idx_cadastro_nome ON cvm.cadastro (denom_social);
