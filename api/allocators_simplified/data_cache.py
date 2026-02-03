"""
Sistema de Cache JSON para Alocadores Simplificado.

Este módulo implementa um sistema de cache em JSON que:
1. Pré-computa todas as queries e salva em arquivos JSON
2. Organiza os dados por cliente para acesso rápido
3. Gera um arquivo de "menu" com opções disponíveis
4. Permite fácil troca entre armazenamento local e Azure

Fluxo:
1. build_cache() - Executa queries e salva em JSONs (pode rodar de madrugada)
2. load_from_cache() - Carrega dados já processados rapidamente
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np

from .config import get_cache_dir, ALLOWED_CLIENTS, HIGHLIGHT_STRING
from .queries import get_query, list_queries


# ============================================================================
# CLASSE PRINCIPAL DE CACHE
# ============================================================================

class AllocatorsCache:
    """
    Gerenciador de cache para dados de alocadores.
    
    O cache é organizado assim:
    /cache_dir/
        menu.json                    # Opções disponíveis (clientes, segmentos, peers)
        flow_by_segment.json         # Dados de fluxo por segmento (todos clientes)
        historical_position/
            {cliente}.json           # Posição histórica por cliente
        current_position/
            {cliente}.json           # Posição atual por cliente
        fund_metrics/
            {cliente}.json           # Métricas por cliente
        portfolio_assets/
            {cliente}.json           # Ativos por cliente
    """
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        Inicializa o gerenciador de cache.
        
        Args:
            cache_dir: Pasta de cache (usa config padrão se não especificada)
        """
        self.cache_dir = cache_dir or get_cache_dir()
        self._ensure_dirs()
    
    def _ensure_dirs(self):
        """Cria estrutura de diretórios necessária."""
        dirs = [
            self.cache_dir,
            self.cache_dir / "historical_position",
            self.cache_dir / "current_position",
            self.cache_dir / "fund_metrics",
            self.cache_dir / "portfolio_assets",
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)
    
    def _df_to_json_safe(self, df: pd.DataFrame) -> list:
        """Converte DataFrame para lista de dicts, tratando NaN e datas."""
        if df.empty:
            return []
        
        # Converter datetime para string
        for col in df.select_dtypes(include=['datetime64']).columns:
            df[col] = df[col].dt.strftime('%Y-%m-%d')
        
        # Substituir NaN por None
        df = df.replace({np.nan: None})
        
        return df.to_dict(orient='records')
    
    def _save_json(self, data: Any, path: Path):
        """Salva dados em arquivo JSON."""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"[CACHE] Saved: {path}")
    
    def _load_json(self, path: Path) -> Optional[Any]:
        """Carrega dados de arquivo JSON."""
        if not path.exists():
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    # ========================================================================
    # MÉTODOS DE BUILD (rodar de madrugada)
    # ========================================================================
    
    def build_all(self, db_connector):
        """
        Constrói todo o cache a partir das queries SQL.
        
        Este método pode demorar até 2 horas dependendo do volume de dados.
        Ideal para rodar como job de madrugada.
        
        Args:
            db_connector: Instância do PostgresConnector
        """
        print(f"[CACHE] Starting full cache build at {datetime.now()}")
        start_time = datetime.now()
        
        # 1. Build menu (opções disponíveis)
        self._build_menu(db_connector)
        
        # 2. Build flow by segment (dados globais)
        self._build_flow_by_segment(db_connector)
        
        # 3. Build dados por cliente
        for query_type in ['historical_position', 'current_position', 'fund_metrics', 'portfolio_assets']:
            self._build_by_client(db_connector, query_type)
        
        elapsed = datetime.now() - start_time
        print(f"[CACHE] Full cache build completed in {elapsed}")
        
        # Salvar metadata
        self._save_metadata(elapsed)
    
    def _build_menu(self, db_connector):
        """Constrói arquivo de menu com opções disponíveis."""
        print("[CACHE] Building menu...")
        
        query = get_query('available_options')
        df = db_connector.read_sql(query)
        
        if df.empty:
            menu = {
                "clients": ALLOWED_CLIENTS,
                "segments_by_client": {},
                "peers": [],
                "updated_at": datetime.now().isoformat()
            }
        else:
            clients = sorted(df['cliente'].dropna().unique().tolist())
            peers = sorted(df['peer'].dropna().unique().tolist())
            
            segments_by_client = {}
            for client in clients:
                segments = sorted(
                    df[df['cliente'] == client]['cliente_segmentado'].dropna().unique().tolist()
                )
                segments_by_client[client] = segments
            
            menu = {
                "clients": clients,
                "segments_by_client": segments_by_client,
                "peers": peers,
                "updated_at": datetime.now().isoformat()
            }
        
        self._save_json(menu, self.cache_dir / "menu.json")
    
    def _build_flow_by_segment(self, db_connector):
        """Constrói cache de fluxo por segmento."""
        print("[CACHE] Building flow_by_segment...")
        
        query = get_query('flow_by_segment')
        df = db_connector.read_sql(query)
        
        data = {
            "data": self._df_to_json_safe(df),
            "updated_at": datetime.now().isoformat()
        }
        
        self._save_json(data, self.cache_dir / "flow_by_segment.json")
    
    def _build_by_client(self, db_connector, query_type: str):
        """
        Constrói cache de um tipo de query, particionado por cliente.
        
        Args:
            db_connector: Conexão com banco
            query_type: Tipo de query (historical_position, current_position, etc)
        """
        print(f"[CACHE] Building {query_type} by client...")
        
        query = get_query(query_type)
        df = db_connector.read_sql(query)
        
        if df.empty:
            return
        
        # Salvar por cliente
        clients = df['cliente'].dropna().unique()
        for client in clients:
            if client not in ALLOWED_CLIENTS:
                continue
                
            df_client = df[df['cliente'] == client]
            data = {
                "client": client,
                "data": self._df_to_json_safe(df_client),
                "count": len(df_client),
                "updated_at": datetime.now().isoformat()
            }
            
            # Sanitizar nome do arquivo
            safe_name = client.replace(' ', '_').replace('/', '_')
            path = self.cache_dir / query_type / f"{safe_name}.json"
            self._save_json(data, path)
    
    def _save_metadata(self, elapsed):
        """Salva metadata do último build."""
        metadata = {
            "last_build": datetime.now().isoformat(),
            "elapsed_seconds": elapsed.total_seconds(),
            "queries_available": list_queries(),
            "cache_dir": str(self.cache_dir)
        }
        self._save_json(metadata, self.cache_dir / "metadata.json")
    
    # ========================================================================
    # MÉTODOS DE LEITURA (rápidos)
    # ========================================================================
    
    def get_menu(self) -> dict:
        """Retorna opções disponíveis (clientes, segmentos, peers)."""
        data = self._load_json(self.cache_dir / "menu.json")
        return data or {"clients": [], "segments_by_client": {}, "peers": []}
    
    def get_flow_by_segment(self, client: Optional[str] = None, peers: Optional[List[str]] = None) -> list:
        """
        Retorna dados de fluxo por segmento.
        
        Args:
            client: Filtrar por cliente (opcional)
            peers: Lista de peers para filtrar (opcional)
            
        Returns:
            Lista de dicts com dados de fluxo
        """
        data = self._load_json(self.cache_dir / "flow_by_segment.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if client:
            result = [r for r in result if r.get('cliente') == client]
        
        if peers:
            result = [r for r in result if r.get('peer_ativo') in peers]
        
        return result
    
    def get_historical_position(self, client: str, peers: Optional[List[str]] = None) -> list:
        """
        Retorna posição histórica de um cliente.
        
        Args:
            client: Nome do cliente
            peers: Lista de peers para filtrar (opcional)
        """
        safe_name = client.replace(' ', '_').replace('/', '_')
        data = self._load_json(self.cache_dir / "historical_position" / f"{safe_name}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if peers:
            result = [r for r in result if r.get('peer') in peers]
        
        return result
    
    def get_current_position(
        self, 
        client: str, 
        segment: Optional[str] = None, 
        peers: Optional[List[str]] = None
    ) -> list:
        """
        Retorna posição atual de um cliente.
        
        Args:
            client: Nome do cliente
            segment: Cliente segmentado (opcional)
            peers: Lista de peers (opcional)
        """
        safe_name = client.replace(' ', '_').replace('/', '_')
        data = self._load_json(self.cache_dir / "current_position" / f"{safe_name}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if segment:
            result = [r for r in result if r.get('cliente_segmentado') == segment]
        
        if peers:
            result = [r for r in result if r.get('peer') in peers]
        
        return result
    
    def get_fund_metrics(
        self, 
        client: str, 
        segment: Optional[str] = None, 
        peers: Optional[List[str]] = None
    ) -> list:
        """
        Retorna métricas de fundos de um cliente.
        
        Args:
            client: Nome do cliente
            segment: Cliente segmentado (opcional)
            peers: Lista de peers (opcional)
        """
        safe_name = client.replace(' ', '_').replace('/', '_')
        data = self._load_json(self.cache_dir / "fund_metrics" / f"{safe_name}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if segment:
            result = [r for r in result if r.get('cliente_segmentado') == segment]
        
        if peers:
            result = [r for r in result if r.get('peer') in peers]
        
        return result
    
    def get_portfolio_assets(
        self, 
        client: Optional[str] = None,
        segment: Optional[str] = None, 
        cnpj_fundo: Optional[str] = None
    ) -> list:
        """
        Retorna ativos da carteira.
        
        Args:
            client: Nome do cliente (opcional se cnpj_fundo fornecido)
            segment: Cliente segmentado (opcional)
            cnpj_fundo: CNPJ do fundo (busca direta)
        """
        if cnpj_fundo:
            # Buscar em todos os clientes
            for client_file in (self.cache_dir / "portfolio_assets").glob("*.json"):
                data = self._load_json(client_file)
                if data:
                    result = [r for r in data.get("data", []) if r.get('cnpj_fundo') == cnpj_fundo]
                    if result:
                        return result
            return []
        
        if not client:
            return []
            
        safe_name = client.replace(' ', '_').replace('/', '_')
        data = self._load_json(self.cache_dir / "portfolio_assets" / f"{safe_name}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if segment:
            result = [r for r in result if r.get('cliente_segmentado') == segment]
        
        return result
    
    # ========================================================================
    # UTILIDADES
    # ========================================================================
    
    def get_metadata(self) -> dict:
        """Retorna metadata do cache."""
        return self._load_json(self.cache_dir / "metadata.json") or {}
    
    def is_cache_valid(self, max_age_hours: int = 24) -> bool:
        """Verifica se o cache está dentro do prazo de validade."""
        metadata = self.get_metadata()
        if not metadata:
            return False
        
        last_build = metadata.get("last_build")
        if not last_build:
            return False
        
        last_build_dt = datetime.fromisoformat(last_build)
        age = datetime.now() - last_build_dt
        return age.total_seconds() < max_age_hours * 3600
    
    def clear_cache(self):
        """Limpa todos os arquivos de cache."""
        import shutil
        if self.cache_dir.exists():
            shutil.rmtree(self.cache_dir)
        self._ensure_dirs()


# ============================================================================
# INSTÂNCIA GLOBAL (singleton)
# ============================================================================

_cache_instance: Optional[AllocatorsCache] = None

def get_cache() -> AllocatorsCache:
    """Retorna instância singleton do cache."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = AllocatorsCache()
    return _cache_instance
