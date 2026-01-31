import sys
import os
import pandas as pd
from sqlalchemy import text

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

from common.postgresql import PostgresConnector

def run():
    db = PostgresConnector()
    print("--- Starting Complex View Generation (User Defined) ---")
    
    # --- 1. cvm.ativos_carteira ---
    print("--- 1. Creating cvm.ativos_carteira ---")
    sql_ativos = """
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
    """
    db.execute_sql(sql_ativos)

    # --- 2. cvm.cotas ---
    print("--- 2. Creating cvm.cotas ---")
    sql_cotas = """
    DROP MATERIALIZED VIEW IF EXISTS cvm.cotas CASCADE;
    CREATE MATERIALIZED VIEW cvm.cotas AS
    SELECT COALESCE(tp_fundo, tp_fundo_classe) tp_fundo, COALESCE(cnpj_fundo, cnpj_fundo_classe) cnpj_fundo, DATE(dt_comptc) dt_comptc, vl_total, vl_quota, vl_patrim_liq, captc_dia, resg_dia, nr_cotst, id_subclasse
    FROM cvm.fi_doc_inf_diario_inf_diario_fi;
    """
    db.execute_sql(sql_cotas)
    
    # --- 3. cvm.peer (Massive Classification) ---
    print("--- 3. Creating cvm.peer (Detailed Classification) ---")
    # This involves joining cadastro with derived portfolio stats if needed.
    # We will prioritize the NAME MATCHING as requested in the table "Critérios Termos".
    # Implementation Strategy: Massive CASE WHEN based on priority order from the user's table.
    
    sql_peer = """
    DROP MATERIALIZED VIEW IF EXISTS cvm.peer CASCADE;
    CREATE MATERIALIZED VIEW cvm.peer AS
    SELECT 
        c.cnpj_fundo,
        c.denom_social,
        c.classe as classe_cvm,
        CASE
            -- === PREVIDÊNCIA (Prioridade Alta pois nome costuma ser explícito) ===
            WHEN c.denom_social ~* 'Prev.*Crédito|Prev.*CP' THEN 'Previdência - Prev Crédito'
            WHEN c.denom_social ~* 'Prev.*(Super.*Arrojado|Arrojado|Ações|70|100)' THEN 'Previdência - Prev Super Arrojado (70/100)'
            WHEN c.denom_social ~* 'Ciclo.*Vida|2030|2040|2050|Futuro' THEN 'Previdência - Prev Data Alvo'
            WHEN c.denom_social ~* 'Prev.*(Moderado|Macro|Composto)' THEN 'Previdência - Prev MM'
            WHEN c.denom_social ~* 'Balanceado|Perfil.*(30|15|49)' AND c.denom_social ~* 'Prev' THEN 'Previdência - Prev Balanceado (Target Risk)'
            WHEN c.denom_social ~* 'Previdência|Prev|Conservador|Fix' AND c.classe ILIKE '%Renda Fixa%' THEN 'Previdência - Prev RF'
            WHEN c.denom_social ~* 'Previdência|Prev' AND c.classe ILIKE '%Multimercado%' THEN 'Previdência - Prev MM'

            -- === ALOCADORES (Explicit Terms) ===
            WHEN c.denom_social ~* 'Espelho|Feeder|Access|Advisory' THEN 'Multimercado - Feeder / Espelho (Mono)'
            WHEN c.denom_social ~* 'Selection.*Ações|Top.*Ações|FoF.*Ações' THEN 'Ações - FoF Ações (Multigestor)'
            WHEN c.denom_social ~* 'Selection.*RF|Allocation.*RF|FoF.*Crédito' THEN 'Renda Fixa - FoF Renda Fixa / Crédito'
            WHEN c.denom_social ~* 'FIC FIM|Alocação|Selection|Melhores Fundos|Carteira|Allocation' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - FoF Multimercado (Multigestor)'

            -- === MULTIMERCADOS COMPLEXOS ===
            WHEN c.denom_social ~* 'Macro.*Global|Global.*Macro' THEN 'Multimercado - MM Macro Global'
            WHEN c.denom_social ~* 'Macro|Trading|Hedge|Active|Gems|Alpha' AND c.denom_social !~* 'Long Only' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Macro'
            WHEN c.denom_social ~* 'Juros.*Moedas|Rates|Fixed|Income|Juros' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Macro'
            WHEN c.denom_social ~* 'Long Biased|LB|Bias|Equities|Total Return' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Long Biased (Tributação Ações)'
            WHEN c.denom_social ~* 'Equity Hedge|Long Short|L&S|Absoluto' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Equity Hedge (Tributação Ações)'
            WHEN c.denom_social ~* 'Quant|Systematic|Algorithmic|Sigma|Zarathustra|Quantitative' THEN 'Multimercado - MM Quantitativo / Sistemático'
            WHEN c.denom_social ~* 'Vol Target|Vol Control|Risk Parity' THEN 'Multimercado - MM Vol Target'
            WHEN c.denom_social ~* 'Capital Protegido|Garantido|Protected' THEN 'Multimercado - MM Capital Protegido'

            -- === CRÉDITO & EXTERIOR MM ===
            WHEN c.denom_social ~* 'Crédito Privado|CP|High Yield|Crédito Estruturado|Corporate' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Crédito High Yield'
            WHEN c.denom_social ~* 'Crédito Bancário|Bank|Financials|Premium' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Crédito Bancário'
            WHEN c.denom_social ~* 'Investimento no Exterior|IE|Global|International|Offshore' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Investimento no Exterior'

            -- === AÇÕES ===
            WHEN c.denom_social ~* 'Small Caps|Microcap|Smalls|Mid Caps' THEN 'Ações - FIA Small Caps'
            WHEN c.denom_social ~* 'Dividendos|Dividends|Income|Renda' AND c.classe ILIKE '%Ações%' THEN 'Ações - FIA Dividendos'
            WHEN c.denom_social ~* 'Infra|Util|Energia|Elétrica' THEN 'Ações - FIA Infraestrutura / Utilities'
            WHEN c.denom_social ~* 'FMP|FGTS|Mono|Petrobras|Vale|Eletrobras' THEN 'Ações - FIA Mono Ação (FMP)'
            WHEN c.denom_social ~* 'BDR|Nível I|Ações Internacionais|Global Equities' AND c.classe ILIKE '%Ações%' THEN 'Ações - FIA BDR (Nível I/II/III)'
            WHEN c.denom_social ~* 'Ibovespa|Ibov|Indexado|Passivo|IBrX' THEN 'Ações - FIA Ibovespa / IBrX (Passivo)'
            WHEN c.denom_social ~* 'Alavancado|Bull|2x|Turbo' AND c.classe ILIKE '%Ações%' THEN 'Ações - FIA Alavancado (Index)'
            WHEN c.denom_social ~* 'ESG|Sustentável|Verde|Impacto|ASG' THEN 'Ações - FIA ESG / Sustentável'
            WHEN c.denom_social ~* 'Momentum|Quality|Low Vol|Smart Beta' THEN 'Ações - FIA Fator (Momentum/Quality)'
            WHEN c.denom_social ~* 'Ações|FIA|Valor|Fundamental|Long Only|Institucional' THEN 'Ações - FIA Long Only (Valor/Fundamentalista)'

            -- === RENDA FIXA ===
            WHEN c.denom_social ~* 'LIG|Imobiliário RF' THEN 'Renda Fixa - RF LIG / Letras Imobiliárias'
            WHEN c.denom_social ~* 'Incentivado|Infraestrutura|Isento|Debêntures Incentivadas' THEN 'Renda Fixa - RF Debêntures Incentivadas (Infra)'
            WHEN c.denom_social ~* 'High Yield|HY|Structured|Plus|Max' AND c.classe ILIKE '%Renda Fixa%' THEN 'Renda Fixa - RF Crédito High Yield'
            WHEN c.denom_social ~* 'High Grade|Crédito Privado|CP|Liquidez|Corporate' AND c.classe ILIKE '%Renda Fixa%' THEN 'Renda Fixa - RF Crédito High Grade'
            WHEN c.denom_social ~* 'Bancário|Crédito Bancário|Instituições Financeiras' AND c.classe ILIKE '%Renda Fixa%' THEN 'Renda Fixa - RF Crédito Bancário'
            WHEN c.denom_social ~* 'IMA-B|Inflação|IPCA|Real|Ativo' THEN 'Renda Fixa - RF Ativo (Índice de Preços/IMA-B)'
            WHEN c.denom_social ~* 'Pré|Prefixado|IRF-M' THEN 'Renda Fixa - RF Ativo (Prefixado)'
            WHEN c.denom_social ~* 'Simples|Referenciado DI|DI|Soberano|Caixa|Tesouro' THEN 'Renda Fixa - RF Soberano'
            WHEN c.denom_social ~* 'Tesouro Selic|Simples|Zero' THEN 'Renda Fixa - RF Tesouro Selic Simples'
            WHEN c.denom_social ~* 'Liquidez|D\+0|D\+1|Cash' THEN 'Renda Fixa - RF Liquidez D+0/D+1'

            -- === CAMBIAL ===
            WHEN c.denom_social ~* 'Ouro|Gold' THEN 'Cambial - Cambial Ouro'
            WHEN c.denom_social ~* 'Euro|EUR|Moedas' THEN 'Cambial - Cambial Euro/Outras'
            WHEN c.denom_social ~* 'Cambial|Dólar|USD|Moeda' THEN 'Cambial - Cambial Dólar'

            -- === ETF ===
            WHEN c.denom_social ~* 'ETF RF|Tesouro ETF' THEN 'ETF - ETF RF'
            WHEN c.denom_social ~* 'ETF.*Crypto|Bitcoin|Ethereum' THEN 'ETF - ETF Crypto'
            WHEN c.denom_social ~* 'S&P 500|Nasdaq|US Tech' AND c.denom_social ~* 'ETF' THEN 'Invest. Exterior - ETF Exterior'
            WHEN c.denom_social ~* 'ETF|Index|Fundo de Índice' THEN 'ETF - ETF Ações'

            -- === FII (Name based) ===
            WHEN c.denom_social ~* 'Lajes|Escritórios|Corporate' AND c.classe ILIKE '%Imobiliário%' THEN 'FII - FII Tijolo'
            WHEN c.denom_social ~* 'Logística|Log' AND c.classe ILIKE '%Imobiliário%' THEN 'FII - FII Tijolo'
            WHEN c.denom_social ~* 'Shopping|Varejo' AND c.classe ILIKE '%Imobiliário%' THEN 'FII - FII Tijolo'
            WHEN c.denom_social ~* 'Renda Urbana|Híbrido' AND c.classe ILIKE '%Imobiliário%' THEN 'FII - FII Tijolo'
            WHEN c.denom_social ~* 'Recebíveis|Papel|CRI' AND c.classe ILIKE '%Imobiliário%' THEN 'FII - FII Papel'
            WHEN c.denom_social ~* 'Fundo de Fundos|FoF' AND c.classe ILIKE '%Imobiliário%' THEN 'FII - FII Papel'

            -- === OUTROS ===
            WHEN c.denom_social ~* 'Fiagro|Agro' THEN 'FII - Fiagro (Misto)'
            WHEN c.denom_social ~* 'BDR|Ações EUA|Tech' THEN 'Invest. Exterior - BDR Nível I Não Patrocinado'
            WHEN c.denom_social ~* 'Crypto|Cripto|Digital Assets|Blockchain|Access' AND c.classe ILIKE '%Multimercado%' THEN 'Multimercado - MM Criptoativos (Varejo)'
            WHEN c.denom_social ~* 'Exclusivo|Reservado|Família' OR c.fundo_exclusivo = 'S' THEN 'Exclusivo - Fundo Exclusivo / Restrito'
            
            -- Fallback
            WHEN c.classe = 'Fundo Multimercado' THEN 'Multimercado - MM Macro'
            WHEN c.classe = 'Fundo de Ações' THEN 'Ações - Ações Livre'
            WHEN c.classe = 'Fundo de Renda Fixa' THEN 'Renda Fixa - RF Liquidez D+0/D+1'
            ELSE 'Outros - Outros'
        END as peer_classificacao_full
    FROM cvm.cadastro c
    WHERE c.dt_fim IS NULL;
    """
    db.execute_sql(sql_peer)

    # --- 4. cvm.carteira (Allocators) ---
    print("--- 4. Creating cvm.carteira ---")
    
    # Needs cvm.depara_gestores and alocadores.cliente_segmentado schema/tables
    check_schemas = """
    CREATE SCHEMA IF NOT EXISTS alocadores;
    CREATE TABLE IF NOT EXISTS alocadores.cliente_segmentado (cnpj_fundo VARCHAR, segmentacao VARCHAR);
    CREATE TABLE IF NOT EXISTS cvm.depara_gestores (gestor VARCHAR, grupo VARCHAR, tabela VARCHAR);
    """
    db.execute_sql(check_schemas)

    sql_carteira = """
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
    """
    db.execute_sql(sql_carteira)
    print("--- Views Created Successfully ---")

if __name__ == "__main__":
    run()
