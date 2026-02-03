"""
Sistema de Cache JSON para Alocadores Simplificado - VERSÃO OTIMIZADA.

ESTRATÉGIA:
1. Rodar TODAS as queries UMA VEZ (as queries são o gargalo)
2. Iterar pelos DataFrames na memória
3. Ir salvando JSONs incrementalmente (mostrando progresso)
4. Filtrar fund_metrics para TOP N fundos por posição (evitar arquivos grandes)

Assim se algo travar, você já terá arquivos salvos.
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np

from .config import get_cache_dir, HIGHLIGHT_STRING, TOP_FUNDS_LIMIT
from .queries import get_query, list_queries


class AllocatorsCache:
    """
    Gerenciador de cache para dados de alocadores.
    
    Estrutura:
        /cache_dir/
            menu.json
            flow_by_segment/{cliente}.json
            historical_position/{cliente}.json
            current_position/{cliente}__{segmento}.json
            fund_metrics/{cliente}__{segmento}.json  (FILTRADO: top N fundos)
            portfolio_assets/{cliente}__{segmento}__{cnpj}.json
    """
    
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or get_cache_dir()
        self._ensure_dirs()
    
    def _ensure_dirs(self):
        """Cria estrutura de diretórios."""
        dirs = [
            self.cache_dir,
            self.cache_dir / "flow_by_segment",
            self.cache_dir / "historical_position",
            self.cache_dir / "current_position",
            self.cache_dir / "fund_metrics",
            self.cache_dir / "portfolio_assets",
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)
    
    def _sanitize_name(self, name: str) -> str:
        """Sanitiza nome para arquivo."""
        if not name:
            return "_unknown_"
        return str(name).replace(' ', '_').replace('/', '_').replace('.', '_').replace('-', '_')
    
    def _df_to_records(self, df: pd.DataFrame) -> list:
        """Converte DataFrame para list of dicts."""
        if df.empty:
            return []
        
        df = df.copy()
        
        # Converter datetime para string
        for col in df.select_dtypes(include=['datetime64']).columns:
            df[col] = df[col].dt.strftime('%Y-%m-%d')
        
        # Substituir NaN por None
        df = df.replace({np.nan: None})
        
        return df.to_dict(orient='records')
    
    def _save_json(self, data: Any, path: Path, silent: bool = False):
        """Salva JSON e mostra tamanho."""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, default=str)
        
        if not silent:
            size_kb = path.stat().st_size / 1024
            print(f"  ✓ {path.name} ({size_kb:.1f} KB)")
    
    def _load_json(self, path: Path) -> Optional[Any]:
        """Carrega JSON."""
        if not path.exists():
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    # ========================================================================
    # BUILD - OTIMIZADO (queries primeiro, depois itera)
    # ========================================================================
    
    def build_all(self, db_connector):
        """
        Constrói todo o cache.
        
        ESTRATÉGIA OTIMIZADA:
        1. Roda TODAS as queries uma vez (gargalo)
        2. Itera pelos DataFrames na memória
        3. Salva JSONs incrementalmente
        4. Filtra fund_metrics para top N fundos por segmento
        """
        print("=" * 60)
        print("CACHE BUILD - VERSÃO OTIMIZADA")
        print(f"TOP_FUNDS_LIMIT = {TOP_FUNDS_LIMIT}")
        print("=" * 60)
        start_time = datetime.now()
        
        # ====================================================================
        # FASE 1: RODAR TODAS AS QUERIES (o gargalo está aqui)
        # ====================================================================
        print("\n[FASE 1] Executando queries (isso vai demorar)...")
        
        dataframes = {}
        queries_to_run = [
            'available_options',
            'flow_by_segment', 
            'historical_position',
            'current_position',
            'fund_metrics',
            'portfolio_assets'
        ]
        
        for query_name in queries_to_run:
            print(f"\n  Executando: {query_name}...", end=" ", flush=True)
            query_start = datetime.now()
            
            query = get_query(query_name)
            df = db_connector.read_sql(query)
            dataframes[query_name] = df
            
            elapsed = (datetime.now() - query_start).total_seconds()
            print(f"OK! ({len(df)} linhas, {elapsed:.1f}s)")
        
        print("\n" + "=" * 60)
        print("[FASE 2] Processando DataFrames e salvando JSONs...")
        print("=" * 60)
        
        # ====================================================================
        # FASE 2: PROCESSAR E SALVAR (iterando na memória, rápido)
        # ====================================================================
        
        files_saved = 0
        
        # 2.1 Menu
        print("\n[2.1] Salvando menu...")
        menu = self._process_menu(dataframes['available_options'])
        self._save_json(menu, self.cache_dir / "menu.json")
        files_saved += 1
        
        # 2.2 Flow by segment (por cliente)
        print("\n[2.2] Salvando flow_by_segment por cliente...")
        files_saved += self._process_flow_by_client(dataframes['flow_by_segment'])
        
        # 2.3 Historical position (por cliente)
        print("\n[2.3] Salvando historical_position por cliente...")
        files_saved += self._process_historical_by_client(dataframes['historical_position'])
        
        # 2.4 Current position (por cliente+segmento)
        print("\n[2.4] Salvando current_position por cliente+segmento...")
        files_saved += self._process_current_position(dataframes['current_position'])
        
        # 2.5 Fund metrics (por cliente+segmento, FILTRADO para top N)
        print(f"\n[2.5] Salvando fund_metrics por cliente+segmento (top {TOP_FUNDS_LIMIT} fundos)...")
        files_saved += self._process_fund_metrics_filtered(
            dataframes['fund_metrics'], 
            dataframes['current_position']
        )
        
        # 2.6 Portfolio assets (por cliente+segmento+cnpj)
        print("\n[2.6] Salvando portfolio_assets por fundo (granular)...")
        files_saved += self._process_portfolio_assets(dataframes['portfolio_assets'])
        
        # ====================================================================
        # FASE 3: METADATA
        # ====================================================================
        elapsed = datetime.now() - start_time
        print("\n" + "=" * 60)
        print(f"BUILD COMPLETO!")
        print(f"  Arquivos salvos: {files_saved}")
        print(f"  Tempo total: {elapsed}")
        print("=" * 60)
        
        self._save_metadata(elapsed, files_saved)
    
    def _process_menu(self, df: pd.DataFrame) -> dict:
        """Processa DataFrame de opções em menu JSON."""
        if df.empty:
            return {
                "clients": [],
                "segments_by_client": {},
                "peers": [],
                "updated_at": datetime.now().isoformat()
            }
        
        clients = sorted(df['cliente'].dropna().unique().tolist())
        peers = sorted(df['peer'].dropna().unique().tolist())
        
        segments_by_client = {}
        for client in clients:
            segments = sorted(
                df[df['cliente'] == client]['cliente_segmentado'].dropna().unique().tolist()
            )
            segments_by_client[client] = segments
        
        return {
            "clients": clients,
            "segments_by_client": segments_by_client,
            "peers": peers,
            "updated_at": datetime.now().isoformat()
        }
    
    def _process_flow_by_client(self, df: pd.DataFrame) -> int:
        """Salva flow por cliente."""
        if df.empty:
            return 0
        
        files_saved = 0
        for client in df['cliente'].dropna().unique():
            df_client = df[df['cliente'] == client]
            
            data = {
                "client": client,
                "data": self._df_to_records(df_client),
                "count": len(df_client),
                "updated_at": datetime.now().isoformat()
            }
            
            safe_name = self._sanitize_name(client)
            path = self.cache_dir / "flow_by_segment" / f"{safe_name}.json"
            self._save_json(data, path)
            files_saved += 1
        
        return files_saved
    
    def _process_historical_by_client(self, df: pd.DataFrame) -> int:
        """Salva historical por cliente."""
        if df.empty:
            return 0
        
        files_saved = 0
        for client in df['cliente'].dropna().unique():
            df_client = df[df['cliente'] == client]
            
            data = {
                "client": client,
                "data": self._df_to_records(df_client),
                "count": len(df_client),
                "updated_at": datetime.now().isoformat()
            }
            
            safe_name = self._sanitize_name(client)
            path = self.cache_dir / "historical_position" / f"{safe_name}.json"
            self._save_json(data, path)
            files_saved += 1
        
        return files_saved
    
    def _process_current_position(self, df: pd.DataFrame) -> int:
        """Salva current_position por cliente+segmento."""
        if df.empty:
            return 0
        
        files_saved = 0
        groups = df.groupby(['cliente', 'cliente_segmentado'])
        
        for (client, segment), df_group in groups:
            if pd.isna(client) or pd.isna(segment):
                continue
            
            # Ordenar por vl_merc_pos_final e pegar top N
            df_sorted = df_group.sort_values('vl_merc_pos_final', ascending=False)
            df_top = df_sorted.head(TOP_FUNDS_LIMIT)
            
            data = {
                "client": client,
                "segment": segment,
                "data": self._df_to_records(df_top),
                "count": len(df_top),
                "total_count": len(df_group),
                "updated_at": datetime.now().isoformat()
            }
            
            safe_client = self._sanitize_name(client)
            safe_segment = self._sanitize_name(segment)
            prefix = f"{safe_client}__{safe_segment}"
            
            path = self.cache_dir / "current_position" / f"{prefix}.json"
            self._save_json(data, path)
            files_saved += 1
        
        return files_saved
    
    def _process_fund_metrics_filtered(self, df_metrics: pd.DataFrame, df_position: pd.DataFrame) -> int:
        """
        Salva fund_metrics por cliente+segmento.
        FILTRA para apenas os top N fundos por posição (evita arquivos de 300MB).
        """
        if df_metrics.empty:
            return 0
        
        files_saved = 0
        
        # Primeiro, calcular top N fundos por segmento a partir de current_position
        top_funds_by_segment = {}
        groups = df_position.groupby(['cliente', 'cliente_segmentado'])
        
        for (client, segment), df_group in groups:
            if pd.isna(client) or pd.isna(segment):
                continue
            
            # Top N CNPJs por posição
            df_sorted = df_group.sort_values('vl_merc_pos_final', ascending=False)
            top_cnpjs = df_sorted.head(TOP_FUNDS_LIMIT)['cnpj_fundo_cota'].unique().tolist()
            top_funds_by_segment[(client, segment)] = set(top_cnpjs)
        
        # Agora processar metrics filtrando apenas os CNPJs do top N
        metrics_groups = df_metrics.groupby(['cliente', 'cliente_segmentado'])
        
        for (client, segment), df_group in metrics_groups:
            if pd.isna(client) or pd.isna(segment):
                continue
            
            # Pegar CNPJs do top N
            top_cnpjs = top_funds_by_segment.get((client, segment), set())
            
            if not top_cnpjs:
                continue
            
            # Filtrar para apenas top N
            df_filtered = df_group[df_group['cnpj_fundo'].isin(top_cnpjs)]
            
            if df_filtered.empty:
                continue
            
            data = {
                "client": client,
                "segment": segment,
                "data": self._df_to_records(df_filtered),
                "count": len(df_filtered),
                "funds_included": len(top_cnpjs),
                "updated_at": datetime.now().isoformat()
            }
            
            safe_client = self._sanitize_name(client)
            safe_segment = self._sanitize_name(segment)
            prefix = f"{safe_client}__{safe_segment}"
            
            path = self.cache_dir / "fund_metrics" / f"{prefix}.json"
            self._save_json(data, path)
            files_saved += 1
        
        return files_saved
    
    def _process_portfolio_assets(self, df: pd.DataFrame) -> int:
        """Salva portfolio assets de forma granular."""
        if df.empty:
            return 0
        
        files_saved = 0
        segment_groups = df.groupby(['cliente', 'cliente_segmentado'])
        
        for (client, segment), df_segment in segment_groups:
            if pd.isna(client) or pd.isna(segment):
                continue
            
            safe_client = self._sanitize_name(client)
            safe_segment = self._sanitize_name(segment)
            prefix = f"{safe_client}__{safe_segment}"
            
            cnpjs = df_segment['cnpj_fundo'].dropna().unique().tolist()
            
            # Salvar índice
            index_data = {
                "client": client,
                "segment": segment,
                "cnpjs": cnpjs,
                "count": len(cnpjs),
                "updated_at": datetime.now().isoformat()
            }
            index_path = self.cache_dir / "portfolio_assets" / f"{prefix}__index.json"
            self._save_json(index_data, index_path, silent=True)
            files_saved += 1
            
            # Salvar cada CNPJ
            for cnpj in cnpjs:
                df_cnpj = df_segment[df_segment['cnpj_fundo'] == cnpj]
                
                data = {
                    "client": client,
                    "segment": segment,
                    "cnpj_fundo": cnpj,
                    "data": self._df_to_records(df_cnpj),
                    "count": len(df_cnpj),
                    "updated_at": datetime.now().isoformat()
                }
                
                safe_cnpj = self._sanitize_name(cnpj)
                path = self.cache_dir / "portfolio_assets" / f"{prefix}__{safe_cnpj}.json"
                self._save_json(data, path, silent=True)
                files_saved += 1
            
            print(f"  ✓ {client}/{segment}: {len(cnpjs)} fundos")
        
        return files_saved
    
    def _save_metadata(self, elapsed, files_saved: int):
        """Salva metadata."""
        metadata = {
            "last_build": datetime.now().isoformat(),
            "elapsed_seconds": elapsed.total_seconds(),
            "files_saved": files_saved,
            "top_funds_limit": TOP_FUNDS_LIMIT,
            "cache_dir": str(self.cache_dir)
        }
        self._save_json(metadata, self.cache_dir / "metadata.json")
    
    # ========================================================================
    # MÉTODOS DE LEITURA (rápidos)
    # ========================================================================
    
    def get_menu(self) -> dict:
        """Retorna menu de opções."""
        data = self._load_json(self.cache_dir / "menu.json")
        return data or {"clients": [], "segments_by_client": {}, "peers": []}
    
    def get_flow_by_segment(self, client: str, peers: Optional[List[str]] = None) -> list:
        """Retorna flow de um cliente."""
        safe_client = self._sanitize_name(client)
        data = self._load_json(self.cache_dir / "flow_by_segment" / f"{safe_client}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if peers:
            result = [r for r in result if r.get('peer_ativo') in peers]
        
        return result
    
    def get_historical_position(self, client: str, peers: Optional[List[str]] = None) -> list:
        """Retorna posição histórica."""
        safe_client = self._sanitize_name(client)
        data = self._load_json(self.cache_dir / "historical_position" / f"{safe_client}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if peers:
            result = [r for r in result if r.get('peer') in peers]
        
        return result
    
    def get_current_position(self, client: str, segment: str, peers: Optional[List[str]] = None) -> list:
        """Retorna posição atual (já filtrado para top N)."""
        safe_client = self._sanitize_name(client)
        safe_segment = self._sanitize_name(segment)
        prefix = f"{safe_client}__{safe_segment}"
        
        data = self._load_json(self.cache_dir / "current_position" / f"{prefix}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if peers:
            result = [r for r in result if r.get('peer') in peers]
        
        return result
    
    def get_fund_metrics(self, client: str, segment: str, peers: Optional[List[str]] = None) -> list:
        """Retorna métricas (já filtrado para top N fundos)."""
        safe_client = self._sanitize_name(client)
        safe_segment = self._sanitize_name(segment)
        prefix = f"{safe_client}__{safe_segment}"
        
        data = self._load_json(self.cache_dir / "fund_metrics" / f"{prefix}.json")
        if not data:
            return []
        
        result = data.get("data", [])
        
        if peers:
            result = [r for r in result if r.get('peer') in peers]
        
        return result
    
    def get_portfolio_assets(
        self, 
        client: str = None,
        segment: str = None, 
        cnpj_fundo: Optional[str] = None
    ) -> list:
        """Retorna ativos da carteira."""
        
        if cnpj_fundo and client and segment:
            safe_client = self._sanitize_name(client)
            safe_segment = self._sanitize_name(segment)
            safe_cnpj = self._sanitize_name(cnpj_fundo)
            prefix = f"{safe_client}__{safe_segment}__{safe_cnpj}"
            
            data = self._load_json(self.cache_dir / "portfolio_assets" / f"{prefix}.json")
            if data:
                return data.get("data", [])
            return []
        
        if cnpj_fundo:
            safe_cnpj = self._sanitize_name(cnpj_fundo)
            for file in (self.cache_dir / "portfolio_assets").glob(f"*__{safe_cnpj}.json"):
                data = self._load_json(file)
                if data:
                    return data.get("data", [])
            return []
        
        if not client or not segment:
            return []
        
        safe_client = self._sanitize_name(client)
        safe_segment = self._sanitize_name(segment)
        prefix = f"{safe_client}__{safe_segment}"
        
        index_data = self._load_json(self.cache_dir / "portfolio_assets" / f"{prefix}__index.json")
        if not index_data:
            return []
        
        result = []
        for cnpj in index_data.get("cnpjs", []):
            safe_cnpj = self._sanitize_name(cnpj)
            file_path = self.cache_dir / "portfolio_assets" / f"{prefix}__{safe_cnpj}.json"
            data = self._load_json(file_path)
            if data:
                result.extend(data.get("data", []))
        
        return result
    
    def get_fund_cnpjs_in_portfolio(self, client: str, segment: str) -> list:
        """Retorna lista de CNPJs que estão na carteira do cliente+segmento."""
        safe_client = self._sanitize_name(client)
        safe_segment = self._sanitize_name(segment)
        prefix = f"{safe_client}__{safe_segment}"
        
        index_data = self._load_json(self.cache_dir / "portfolio_assets" / f"{prefix}__index.json")
        if not index_data:
            return []
        
        return index_data.get("cnpjs", [])
    
    # ========================================================================
    # UTILIDADES
    # ========================================================================
    
    def get_metadata(self) -> dict:
        return self._load_json(self.cache_dir / "metadata.json") or {}
    
    def is_cache_valid(self, max_age_hours: int = 24) -> bool:
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
        import shutil
        if self.cache_dir.exists():
            shutil.rmtree(self.cache_dir)
        self._ensure_dirs()


# Singleton
_cache_instance: Optional[AllocatorsCache] = None

def get_cache() -> AllocatorsCache:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = AllocatorsCache()
    return _cache_instance
