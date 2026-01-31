import subprocess
import sys
import time
import os

def run_step(script_path, description):
    print(f"\n{'='*50}")
    print(f"STEP: {description}")
    print(f"SCRIPT: {script_path}")
    print(f"{'='*50}\n")
    
    start_time = time.time()
    try:
        # Use sys.executable to ensure we use the same python interpreter
        result = subprocess.run([sys.executable, script_path], check=True, text=True)
        elapsed = time.time() - start_time
        print(f"\n[SUCCESS] {description} completed in {elapsed:.2f} seconds.")
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] {description} failed with exit code {e.returncode}.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[CRITICAL] Error executing {description}: {e}")
        sys.exit(1)

def main():
    print("Starting Financial Data Lab Pipeline Execution...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Populate Depara Gestores
    run_step(os.path.join(base_dir, 'data', 'populate_depara_gestores.py'), "Populating Manager Mapping (cvm.depara_gestores)")
    
    # 2. Update Complex Views (Phase 1)
    # This creates cvm.ativos_carteira, cvm.cotas, cvm.peer, cvm.carteira
    run_step(os.path.join(base_dir, 'data', 'update_complex_views.py'), "Creating/Updating Database Views (Phase 1)")

    # 3. Create Allocator Tables (Phase 2)
    # This creates the analytical tables in 'alocadores' schema
    run_step(os.path.join(base_dir, 'data', 'create_allocator_tables.py'), "Creating Allocator Intelligence Tables (Phase 2)")

    # 4. Generate Cache JSONs (Phase 3)
    # This pre-calculates JSONs for specific funds to be served precisely by the API
    run_step(os.path.join(base_dir, 'data', 'generate_cache_jsons.py'), "Generating Static JSON Cache (Phase 3)")

    print("\n" + "="*50)
    print("PIPELINE EXECUTION COMPLETED SUCCESSFULLY")
    print("="*50)
    print("You can now start the API and Frontend servers.")

if __name__ == "__main__":
    main()
