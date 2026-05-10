#!/usr/bin/env python
"""
Incremental update pipeline — brings CVM data up to date from last ingested date.
Never deletes existing data. Safe to run repeatedly.

Usage:
    python ingestion/run_update.py
    python ingestion/run_update.py --from 2026-01-01
    python ingestion/run_update.py --dry-run
"""

import sys
import os
import subprocess
import time
from datetime import datetime, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config.postgresql import PostgresConnector

TOTAL_STEPS = 6
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def query_last_date(db: PostgresConnector) -> date | None:
    """Get the most recent dt_comptc from the raw inf_diario table."""
    df = db.read_sql(
        "SELECT MAX(dt_comptc) AS max_date FROM cvm.fi_doc_inf_diario_inf_diario_fi"
    )
    if df.empty or df.iloc[0]["max_date"] is None:
        return None
    val = df.iloc[0]["max_date"]
    # Handle various return types (datetime, Timestamp, string)
    if isinstance(val, str):
        from datetime import date as dt_date
        return dt_date.fromisoformat(val[:10])
    if hasattr(val, "date"):
        return val.date()
    # Already a date object
    return val


def run_step(
    step_num: int,
    description: str,
    cmd: list[str],
    allow_continue: bool = False,
) -> bool:
    """Run a pipeline step with timing. Returns True on success."""
    print(f"\n{'='*60}")
    print(f"[STEP {step_num}/{TOTAL_STEPS}] {description}")
    print(f"{'='*60}")
    print(f"  Comando: {' '.join(cmd)}")
    sys.stdout.flush()

    t0 = time.time()
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            cwd=PROJECT_ROOT,
        )
        elapsed = time.time() - t0

        # Print stdout/stderr
        if result.stdout:
            for line in result.stdout.splitlines():
                print(f"  {line}")
        if result.stderr:
            for line in result.stderr.splitlines():
                print(f"  [ERR] {line}", file=sys.stderr)

        if result.returncode != 0:
            print(f"\n[ERROR] Passo {step_num} falhou (exit={result.returncode}) em {elapsed:.1f}s")
            if allow_continue:
                resp = input("  Continuar? [s/N]: ").strip().lower()
                if resp == "s":
                    print("  Continuando...")
                    return True
                else:
                    print("  Abortando.")
                    return False
            else:
                print("  Abortando pipeline.")
                return False

        print(f"\n[OK] Passo {step_num} concluído em {elapsed:.1f}s")
        return True
    except FileNotFoundError as e:
        print(f"\n[ERROR] Comando não encontrado: {e}")
        return False
    except Exception as e:
        print(f"\n[ERROR] Exceção no passo {step_num}: {e}")
        return False


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Incremental CVM data update pipeline — never deletes existing data."
    )
    parser.add_argument(
        "--from",
        dest="from_date",
        type=str,
        default=None,
        help="Force start date YYYY-MM-DD (otherwise auto-detected from DB)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without making changes",
    )
    args = parser.parse_args()

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    python_exe = sys.executable

    # ── Step 0: Determine last date ───────────────────────────────────
    if args.from_date:
        last_date = args.from_date
        print(f"[INFO] Data inicial forçada: {last_date}")
    else:
        db = PostgresConnector()
        last_date_obj = query_last_date(db)
        if last_date_obj is None:
            print("[INFO] Nenhum dado encontrado no banco. Usando data inicial padrão.")
            last_date = None
        else:
            last_date = last_date_obj.isoformat()
            print(f"[INFO] Dados atuais até: {last_date}. Atualizando para hoje ({date.today().isoformat()})...")

    if args.dry_run:
        print("[INFO] *** MODO DRY-RUN — nenhuma alteração será feita ***")

    print(f"[INFO] Pipeline iniciada em {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sys.stdout.flush()

    # ── Step 1: Download ──────────────────────────────────────────────
    download_cmd = [python_exe, os.path.join(project_root, "ingestion", "cvm", "download.py")]
    if last_date:
        download_cmd.extend(["--from", last_date])
    if args.dry_run:
        download_cmd.append("--dry-run")

    ok = run_step(1, "Download de novos arquivos CVM", download_cmd, allow_continue=True)
    if not ok:
        sys.exit(1)

    # ── Step 2: Ingest CSVs ───────────────────────────────────────────
    ingest_cmd = [
        python_exe,
        os.path.join(project_root, "ingestion", "cvm", "ingest_tables.py"),
        "--complete-missing",
    ]
    if last_date:
        ingest_cmd.extend(["--from", last_date])

    ok = run_step(2, "Ingestão de CSVs no banco de dados", ingest_cmd, allow_continue=True)
    if not ok:
        sys.exit(1)

    # ── Step 3: Update cadastro ───────────────────────────────────────
    cadastro_cmd = [
        python_exe,
        os.path.join(project_root, "ingestion", "cvm", "cadastro_update.py"),
    ]
    ok = run_step(3, "Atualização do cadastro de fundos (cvm.cadastro)", cadastro_cmd, allow_continue=True)
    if not ok:
        sys.exit(1)

    # ── Step 4: Refresh materialized views ────────────────────────────
    views_cmd = [
        python_exe,
        os.path.join(project_root, "scripts", "schema", "update_views.py"),
    ]
    ok = run_step(
        4,
        "Atualização de views materializadas (REFRESH CONCURRENTLY)",
        views_cmd,
        allow_continue=True,
    )
    if not ok:
        sys.exit(1)

    # ── Step 5: Compute metrics ───────────────────────────────────────
    metrics_cmd = [
        python_exe,
        os.path.join(project_root, "ingestion", "cvm", "compute_metrics.py"),
    ]
    ok = run_step(
        5,
        "Cálculo de métricas (cvm.metrics) — incremental, apenas novas datas",
        metrics_cmd,
        allow_continue=True,
    )
    if not ok:
        sys.exit(1)

    # ── Step 6: Refresh depara_gestores ───────────────────────────────
    depara_cmd = [
        python_exe,
        os.path.join(project_root, "data", "populate_depara_gestores.py"),
    ]
    ok = run_step(
        6,
        "Atualização de mapeamento de gestores (cvm.depara_gestores)",
        depara_cmd,
        allow_continue=True,
    )
    if not ok:
        sys.exit(1)

    # ── Done ──────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"[DONE] Atualização concluída em {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
