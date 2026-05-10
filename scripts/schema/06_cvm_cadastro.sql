-- ============================================================
-- 06_cvm_cadastro.sql
-- Extracted from: data/cvm_cadastro.ipynb, data/cvm_cadastro_fix.ipynb
-- Schema: cvm
-- Description: Consolidated fund registration table built from
--   14 historical CVM cadastro tables. Uses temporal merge
--   on (cnpj_fundo, dt_reg, dt_ini, dt_fim) keys.
-- ============================================================

-- NOTE: The cadastro build is primarily implemented in Python
-- notebooks (cvm_cadastro.ipynb, cvm_cadastro_fix.ipynb) using
-- pandas merge/reduce. The source tables are:
--
--   cvm.fi_cad_fi_hist_admin
--   cvm.fi_cad_fi_hist_auditor
--   cvm.fi_cad_fi_hist_classe
--   cvm.fi_cad_fi_hist_condom
--   cvm.fi_cad_fi_hist_controlador
--   cvm.fi_cad_fi_hist_custodiante
--   cvm.fi_cad_fi_hist_denom_social
--   cvm.fi_cad_fi_hist_denom_comerc
--   cvm.fi_cad_fi_hist_diretor_resp
--   cvm.fi_cad_fi_hist_exclusivo
--   cvm.fi_cad_fi_hist_fic
--   cvm.fi_cad_fi_hist_gestor
--   cvm.fi_cad_fi_hist_publico_alvo
--   cvm.fi_cad_fi_hist_rentab
--   cvm.fi_cad_fi_hist_sit
--   cvm.fi_cad_fi_hist_taxa_adm
--   cvm.fi_cad_fi_hist_taxa_perfm
--   cvm.fi_cad_fi_hist_trib_lprazo
--
-- The Python pipeline:
-- 1. Load each table
-- 2. Normalize column names (rename dt_ini_* -> dt_ini, dt_fim_* -> dt_fim)
-- 3. Merge all tables on (cnpj_fundo, dt_reg, dt_ini, dt_fim) using outer join
-- 4. Group by (cnpj_fundo, dt_reg, dt_ini, dt_fim) picking first() per group
-- 5. Forward-fill/carry-forward logic for missing values
--
-- Final columns (target schema):
-- cnpj_fundo, dt_reg, dt_ini, cnpj_admin, admin, cnpj_auditor, auditor,
-- cnpj_custodiante, custodiante, classe, condom, cnpj_controlador, controlador,
-- denom_comerc, denom_social, diretor, fundo_exclusivo, fundo_cotas,
-- pf_pj_gestor, cpf_cnpj_gestor, gestor, publico_alvo, rentab_fundo, sit,
-- taxa_adm, inf_taxa_adm, vl_taxa_perfm, ds_taxa_perfm, trib_lprazo, dt_fim

-- Helper function for safe view drops
CREATE OR REPLACE FUNCTION cvm.drop_view_any(schema_name TEXT, view_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_type CHAR;
BEGIN
    SELECT c.relkind INTO v_type
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = schema_name 
      AND c.relname = view_name;

    IF v_type = 'v' THEN
        EXECUTE format('DROP VIEW %I.%I CASCADE', schema_name, view_name);
        RETURN 'VIEW ' || schema_name || '.' || view_name || ' removida.';
    ELSIF v_type = 'm' THEN
        EXECUTE format('DROP MATERIALIZED VIEW %I.%I CASCADE', schema_name, view_name);
        RETURN 'MATERIALIZED VIEW ' || schema_name || '.' || view_name || ' removida.';
    ELSE
        RETURN 'Objeto não encontrado ou não é uma View.';
    END IF;
END;
$$ LANGUAGE plpgsql;
