"""
CVM Data Downloader — incremental download from dados.cvm.gov.br.

Downloads only FI (Fundos de Investimento) data files matching INF_DIARIO, CDA, CAD keywords.
Skips files already on disk or recently tracked in cvm.ingest_control.

Usage:
    python ingestion/cvm/download.py
    python ingestion/cvm/download.py --from 2026-01-01
    python ingestion/cvm/download.py --dry-run
"""

import sys
import os
import argparse
import zipfile
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse

from sqlalchemy import text
import pandas as pd
import requests
from bs4 import BeautifulSoup

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.postgresql import PostgresConnector

# ── Config ────────────────────────────────────────────────────────────────

BASE_URL = "https://dados.cvm.gov.br/dados/FI/"
DEST_DIR = os.environ.get("CVM_DOWNLOAD_DIR", os.path.join(".", "data_download", "cvm"))

# Only process files whose path contains these keywords
ALLOWED_KEYWORDS = ["INF_DIARIO", "CDA", "CAD"]

# How recent a tracked download must be to skip re-download
REFRESH_DAYS = 7


# ── Setup ──────────────────────────────────────────────────────────────────

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def setup_control_table(db: PostgresConnector) -> None:
    """Ensure cvm.ingest_control exists with the expected schema (idempotent)."""
    df_schema = pd.DataFrame(
        columns=["file_name", "relative_path", "downloaded_at"]
    )
    db.create_table(df_schema, "cvm.ingest_control")

    # Migrate: add missing columns if table already existed with older schema
    with db.engine.begin() as conn:
        existing_cols = {
            row[0]
            for row in conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema = 'cvm' AND table_name = 'ingest_control'"
                )
            )
        }
        for col in ["relative_path", "downloaded_at"]:
            if col not in existing_cols:
                conn.execute(
                    text(f'ALTER TABLE cvm.ingest_control ADD COLUMN "{col}" TEXT;')
                )
                print(f"  [MIGRATION] Coluna '{col}' adicionada a cvm.ingest_control.")
        # Remove __id column if present (not needed)
        if "__id" in existing_cols:
            conn.execute(text('ALTER TABLE cvm.ingest_control DROP COLUMN "__id";'))
            print("  [MIGRATION] Coluna '__id' removida de cvm.ingest_control.")
        # Migrate: copy old last_download values to downloaded_at
        if "last_download" in existing_cols and "downloaded_at" not in existing_cols:
            conn.execute(
                text("UPDATE cvm.ingest_control SET downloaded_at = last_download WHERE downloaded_at IS NULL;")
            )
            print("  [MIGRATION] Dados de 'last_download' copiados para 'downloaded_at'.")
        # Drop old last_download column if still present
        if "last_download" in existing_cols:
            conn.execute(text('ALTER TABLE cvm.ingest_control DROP COLUMN "last_download";'))
            print("  [MIGRATION] Coluna 'last_download' removida.")


def should_skip(
    db: PostgresConnector, file_name: str, relative_path: str
) -> bool:
    """Check if file was downloaded recently or already exists on disk."""
    # 1. Check database (recently tracked)
    query = f"""
        SELECT 1 FROM cvm.ingest_control
        WHERE file_name = '{file_name}'
          AND relative_path = '{relative_path}'
          AND downloaded_at::timestamp > CURRENT_DATE - INTERVAL '{REFRESH_DAYS} days'
    """
    res = db.read_sql(query)
    if not res.empty:
        return True

    # 2. Check filesystem (CSV already on disk)
    local_csv = os.path.join(
        DEST_DIR, relative_path
    ).replace(".zip", ".csv")
    if os.path.exists(local_csv):
        return True

    return False


def register_download(
    db: PostgresConnector, file_name: str, relative_path: str
) -> None:
    """Upsert a download record into cvm.ingest_control."""
    df_log = pd.DataFrame([
        {
            "file_name": file_name,
            "relative_path": relative_path,
            "downloaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    ])
    db.upsert_dataframe(
        df_log,
        "cvm.ingest_control",
        logical_pks=["file_name", "relative_path"],
    )


def file_has_valid_date(file_name: str, from_date: str | None) -> bool:
    """Check if the file name contains a date >= from_date (YYYYMM or YYYY)."""
    if not from_date:
        return True
    from_dt = datetime.strptime(from_date, "%Y-%m-%d")
    # Try YYYYMM pattern first, then YYYY
    parts = file_name.replace(".csv", "").replace(".zip", "").split("_")
    for part in reversed(parts):
        if len(part) == 6 and part.isdigit():
            file_dt = datetime(year=int(part[:4]), month=int(part[4:6]), day=1)
            return file_dt.year > from_dt.year or (
                file_dt.year == from_dt.year and file_dt.month >= from_dt.month
            )
        if len(part) == 4 and part.isdigit():
            return int(part) >= from_dt.year
    return True  # No date in filename → include


def is_allowed_path(relative_path: str) -> bool:
    """Check if the path contains any of the allowed keywords."""
    upper = relative_path.upper()
    return any(kw in upper for kw in ALLOWED_KEYWORDS)


# ── Crawler ────────────────────────────────────────────────────────────────

visited_urls: set = set()


def is_valid_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.netloc == "dados.cvm.gov.br" and parsed.path.startswith(
        "/dados/"
    )


def get_content(url: str) -> tuple[list, list]:
    """Return (subdirectories, file_urls) from an HTML directory listing."""
    try:
        if url in visited_urls or not is_valid_url(url):
            return [], []

        visited_urls.add(url)
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        links = [
            node.get("href")
            for node in soup.find_all("a")
            if node.get("href")
        ]
        pastas: list = []
        arquivos: list = []

        for link in links:
            if link in ("../", "./", "/") or link.startswith("?"):
                continue
            full_url = urljoin(url, link)
            if link.endswith("/"):
                if full_url not in visited_urls:
                    pastas.append(full_url)
            elif link.lower().endswith((".zip", ".csv")):
                arquivos.append(full_url)

        return pastas, arquivos
    except requests.RequestException as e:
        print(f"[WARN] Erro ao acessar {url}: {e}", file=sys.stderr)
        return [], []


def download_file(url: str, dry_run: bool = False) -> None:
    """Download a single file (zip or csv), extract if zip, register."""
    relative_path = urlparse(url).path.replace("/dados/", "").lstrip("/")
    file_name = url.split("/")[-1]

    if not is_allowed_path(relative_path):
        return

    db = PostgresConnector()

    if should_skip(db, file_name, relative_path):
        print(f"[SKIP] Já existe: {file_name}")
        return

    if dry_run:
        print(f"[DRY-RUN] Baixaria: {file_name} -> {relative_path}")
        return

    sub_folders = os.path.split(relative_path)[0]
    local_dir = os.path.join(DEST_DIR, sub_folders)
    ensure_dir(local_dir)
    file_path = os.path.join(local_dir, file_name)

    print(f"[DOWNLOAD] Baixando: {file_name}")
    try:
        resp = requests.get(url, stream=True, timeout=300)
        resp.raise_for_status()
        with open(file_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)

        if file_name.lower().endswith(".zip"):
            with zipfile.ZipFile(file_path, "r") as zip_ref:
                zip_ref.extractall(local_dir)
            os.remove(file_path)

        register_download(db, file_name, relative_path)
    except Exception as e:
        print(f"[ERROR] Falha em {file_name}: {e}", file=sys.stderr)


def run_crawler(from_date: str | None, dry_run: bool) -> None:
    """Recursively crawl BASE_URL and download matching FI files."""
    db = PostgresConnector()
    setup_control_table(db)

    stack = [BASE_URL]
    while stack:
        current_url = stack.pop()
        sub_pastas, arquivos = get_content(current_url)

        for arq_url in arquivos:
            file_name = arq_url.split("/")[-1]
            if not file_has_valid_date(file_name, from_date):
                continue
            download_file(arq_url, dry_run=dry_run)

        stack.extend(sub_pastas)


# ── CLI ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download CVM FI data files incrementally."
    )
    parser.add_argument(
        "--from",
        dest="from_date",
        type=str,
        default=None,
        help="Only download files with dates >= YYYY-MM-DD",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be downloaded without downloading",
    )
    args = parser.parse_args()

    print(f"[INFO] Destino: {DEST_DIR}")
    print(f"[INFO] Crawling: {BASE_URL}")
    if args.from_date:
        print(f"[INFO] A partir de: {args.from_date}")
    if args.dry_run:
        print("[INFO] Modo dry-run — nenhum arquivo será baixado")

    ensure_dir(DEST_DIR)
    run_crawler(from_date=args.from_date, dry_run=args.dry_run)
    print("[DONE] Download concluído.")


if __name__ == "__main__":
    main()
