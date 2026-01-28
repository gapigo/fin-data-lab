
import sys
import os
import pandas as pd

# Path setup
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from api.service import DataService
except ImportError:
    # Try adding api to path directly if running from root
    sys.path.append(os.path.abspath('api'))
    from service import DataService

def test_sanity():
    print("Iniciando Sanity Check...")
    service = DataService()
    
    cnpj = "41.776.752/0001-26" # Kinea Zeus
    
    print(f"\n--- Testando Detalhes para {cnpj} ---")
    detail = service.get_fund_detail(cnpj)
    if detail:
        print(f"Sucesso: {detail.denom_social} - {detail.sit}")
    else:
        print("FALHA: Detalhes não encontrados")
        
    print(f"\n--- Testando Composição ---")
    comp = service.get_fund_composition(cnpj)
    if comp and comp.get('items'):
        print(f"Sucesso: {len(comp['items'])} itens encontrados. Data: {comp['date']}")
    else:
        print("AVISO: Composição vazia (pode ser normal se não tiver carteira aberta)")

    print(f"\n--- Testando Portfolio Detalhado ---")
    port = service.get_portfolio_detailed(cnpj)
    if port and port.get('blocos'):
        print(f"Sucesso: {len(port['blocos'])} blocos encontrados.")
        for b in port['blocos']:
            print(f"  - {b['nome_display']}: {len(b['ativos'])} ativos")
    else:
        print("AVISO: Portfolio detalhado vazio")
        
    print(f"\n--- Testando Estrutura ---")
    struct = service.get_fund_structure(cnpj)
    if struct:
        print(f"Sucesso: Tipo {struct['tipo']}")
        print(f"  Investe em: {len(struct['investe_em'])}")
        print(f"  Investido por: {len(struct['investido_por'])}")
    else:
        print("FALHA: Estrutura retornou None")
        
    print(f"\n--- Testando Allocators ---")
    from api.services.allocators_service import allocators_service
    filters = allocators_service.get_filters()
    print(f"Filtros: {len(filters.get('clients', []))} clientes, {len(filters.get('peers', []))} peers")
    
    print("\nSanity Check Finalizado.")

if __name__ == "__main__":
    test_sanity()
