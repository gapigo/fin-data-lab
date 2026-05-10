-- ============================================================
-- 03_cvm_carteira.sql
-- Extracted from: data/montar_views.ipynb, data/update_complex_views.py
-- Schema: cvm
-- Description: Materialized view — fund-of-funds positions
--   with client segmentation and manager enrichment.
--   This is the central join view for the allocator dashboard.
-- ============================================================

-- Ensure prerequisite schemas/tables exist
CREATE SCHEMA IF NOT EXISTS alocadores;
CREATE TABLE IF NOT EXISTS alocadores.cliente_segmentado (cnpj_fundo VARCHAR, segmentacao VARCHAR);
CREATE TABLE IF NOT EXISTS cvm.depara_gestores (gestor VARCHAR, grupo VARCHAR, tabela VARCHAR);

DROP MATERIALIZED VIEW IF EXISTS cvm.carteira CASCADE;

CREATE MATERIALIZED VIEW cvm.carteira AS 
WITH cad AS (
    SELECT 
        cadastro.cnpj_fundo, 
        COALESCE(depara_gestores.grupo, cadastro.gestor) AS gestor, 
        cadastro.classe, 
        CASE 
            WHEN UPPER(denom_social) LIKE '%PREV%' THEN 'Prev' 
            WHEN cadastro.fundo_exclusivo = 'S' THEN 'Exclusivo' 
            ELSE 'Outros' 
        END AS tipo
    FROM cvm.cadastro 
    LEFT JOIN cvm.depara_gestores ON depara_gestores.gestor = cadastro.gestor
    WHERE cadastro.dt_fim IS NULL
)
SELECT cda.dt_comptc, cda.cnpj_fundo, cda.denom_social, cad_inv.gestor cliente, 
       CASE WHEN cliente_segmentado.segmentacao IS NOT NULL THEN cliente_segmentado.segmentacao 
            ELSE CONCAT(cad_inv.gestor, ' ', cad_inv.tipo) 
       END AS cliente_segmentado, 
       cda.cnpj_fundo_cota, cda.nm_fundo_cota, cad_cota.gestor gestor_cota, cda.vl_merc_pos_final, cad_cota.classe peer
FROM cvm.cda_fi_blc_2 cda 
INNER JOIN cad cad_inv ON cad_inv.cnpj_fundo = cda.cnpj_fundo
INNER JOIN cad cad_cota ON cad_cota.cnpj_fundo = cda.cnpj_fundo_cota
LEFT JOIN alocadores.cliente_segmentado ON cliente_segmentado.cnpj_fundo = cad_inv.cnpj_fundo
WHERE cda.tp_fundo IN ('FI', 'FIF', 'CLASSES - FIF', 'CLASSES - FIP');
