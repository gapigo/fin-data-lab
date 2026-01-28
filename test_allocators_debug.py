
import sys
import os
import pandas as pd

# Adicionar path para importar módulos da API
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))

try:
    from services.allocators import get_allocator_service
    
    print("Iniciando teste AllocatorService...")
    service = get_allocator_service()
    
    print("\n--- Teste get_filters ---")
    filters = service.get_filters()
    print(f"Clientes encontrados: {filters['clients'][:10]}")
    if '2B' in filters['clients']:
        print("ERRO: '2B' ainda está na lista de clientes!")
    else:
        print("SUCESSO: Lista de clientes filtrada corretamente.")

    print("\n--- Teste get_performance (Itaú) ---")
    # Tentar pegar um cliente Itaú válido da lista ou forçar
    perf = service.get_performance(client='Itaú')
    print("Performance Keys:", perf.keys())
    if perf:
        print(f"Flow by Window: {perf.get('flow_by_window')}")
        print(f"Boxplots Ret: {len(perf.get('boxplots_ret', []))} itens")
    else:
        print("Performance vazia ou erro.")

except Exception as e:
    print(f"\nCRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
