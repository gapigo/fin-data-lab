
import sys
import os
import pandas as pd
from io import StringIO

# Adicionar path para importar common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector

raw_data = """cnpj_fundo	segmentacao
31.533.242/0001-74	BTG BPC Multigestores
35.726.949/0001-58	BTG Genoa
05.778.214/0001-07	BTG Julius Baer Alocação
11.233.045/0001-22	BTG Multimercado LS
41.884.249/0001-94	BTG P Multigestor Total Return
09.305.280/0001-40	BTG Pacifico RV
24.977.113/0001-00	BTG Pedra Negra
32.741.500/0001-70	BTG P5 Multimercado
52.217.217/0001-51	BTG P5 Multimercado D30
52.969.708/0001-59	BTG P5 Multimercado D30 Prev
24.215.247/0001-93	BTG QP5
42.279.443/0001-03	BTG Suez MM
58.471.539/0001-09	XP Vexty
37.900.216/0001-13	XP Superprev 2
35.420.569/0001-90	XP Superprev
46.948.233/0001-11	XP Quantitas Capri Prev
15.603.948/0001-09	XP Olimpo
41.762.922/0001-13	XP FP FOF
39.240.107/0001-42	XP Centrus Orion
52.562.579/0001-80	UBS Top Total
07.967.267/0001-00	UBS Multimanager Total Return
20.969.330/0001-05	UBS Multimanager
55.983.603/0001-42	UBS Irai
41.556.860/0001-93	UBS FP FOF
08.971.898/0001-57	UBS CSHG Top
36.617.839/0001-10	Bradesco Valor Relativo PGBL/VGBL
10.586.901/0001-60	Bradesco Portfolio MM
39.807.335/0001-51	Bradesco Portfolio Global
49.800.092/0001-83	Bradesco Portfolio Edge
59.052.566/0001-00	Bradesco Platinum
30.378.535/0001-61	Bradesco PGBL/VGBL
53.205.006/0001-61	Bradesco Owl 2
38.017.817/0001-50	Bradesco Macro PGBL/VGBL
44.703.493/0001-00	Bradesco Libertas
09.536.088/0001-35	Bradesco Azulão
08.915.923/0001-85	Bradesco AT
46.685.249/0001-89	BB Sarahprev Modulo MM
40.021.645/0001-25	BB Previ MM Macro
29.298.975/0001-20	BB Prev Modulo MM
05.142.777/0001-04	BB Prata MM
38.110.000/0001-85	BB MM Multigestor Modulo Macro II
13.703.282/0001-35	BB MM Multigestor Modulo Macro
30.521.533/0001-80	Empiricus SP 1
33.269.171/0001-70	Empiricus SP 2
30.509.286/0001-04	Empiricus Melhores Fundos Multiestratégia
44.027.199/0001-17	Empiricus Nova SP
40.190.995/0001-15	Empiricus MF Retorno Absoluto
47.350.604/0001-21	Empiricus SP Multimercados
33.952.885/0001-88	Empiricus MF Multimercados
40.190.965/0001-09	Empiricus Novas Ideias
35.844.969/0001-23	Empiricus SP Ações (IQ)
45.355.573/0001-76	Empiricus MF Conservador
33.269.222/0001-63	Empiricus SP Arrojado (PG)
36.348.463/0001-96	Itaú Seleção Multifundos
07.967.589/0001-40	Itaú Multi Hedge
42.754.331/0001-67	Itaú Orion
40.345.907/0001-07	Itaú Prev Multi Hedge
57.749.037/0001-10	Itaú Vega
53.322.502/0001-03	Itaú Prev Orion
17.329.627/0001-03	Itaú Seleção Multifundos Plus
29.942.223/0001-50	Itaú Prev Seleção Multifundos
53.313.123/0001-49	Itaú Prev Orion
57.645.110/0001-28	Itaú Rigel
14.172.627/0001-34	Itaú Exclusivo
41.994.727/0001-19	Itaú Exclusivo
55.898.873/0001-55	Itaú Exclusivo
35.175.122/0001-01	Itaú Exclusivo
37.867.754/0001-53	Itaú Exclusivo
29.941.862/0001-09	Itaú Exclusivo
14.172.204/0001-14	Itaú Exclusivo
28.140.888/0001-87	Itaú Exclusivo
09.911.408/0001-90	Itaú Exclusivo
11.714.807/0001-02	Santander Macro Master MM
56.388.213/0001-97	Santander PB Core II
58.108.737/0001-02	Santander PB Master Activa
43.597.660/0001-04	Santander Prev Alocação Macro
37.258.646/0001-83	Santander Prev MRF-5T II
40.005.625/0001-60	Santander Prev PB Bom Retiro II
30.493.620/0001-70	Santander Prev Sevilha Crescimento
30.493.904/0001-67	Santander Prev Sevilha Equilibrio
29.549.598/0001-54	Santander Sevilha Crescimento
47.716.645/0001-99	XP Acaprev Multiestratégia
47.698.814/0001-05	XP Vivaprev Brasília
35.504.874/0001-60	XP Selection MM
39.726.057/0001-08	XP Selection Global"""

def import_data():
    # Parsing manual robusto
    lines = raw_data.strip().split('\n')
    rows = []
    
    print(f"Processando {len(lines)} linhas...")
    
    for line in lines[1:]: # Pular header
        line = line.strip()
        if not line: continue
        
        # Tentar dividir por tab
        parts = line.split('\t')
        
        # Se falhar, tentar dividir por espaço (assumindo CNPJ é o primeiro token)
        if len(parts) < 2:
            parts = line.split(None, 1)
            
        if len(parts) >= 2:
            cnpj = parts[0].strip()
            segmentacao = parts[1].strip()
            rows.append({'cnpj_fundo': cnpj, 'segmentacao': segmentacao})
        else:
            print(f"WARN: Formato inválido na linha: {line}")
            
    df = pd.DataFrame(rows)
    print(f"DataFrame criado com {len(df)} registros.")
    print(df.head())
    
    db = PostgresConnector()
    db.overwrite_table(df, 'alocadores.cliente_segmentado')
    print("Sucesso! Tabela alocadores.cliente_segmentado criada.")

if __name__ == "__main__":
    import_data()
