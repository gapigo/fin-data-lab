import sys
import os
# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

from common.postgresql import PostgresConnector

try:
    db = PostgresConnector()
    print("Checking cvm.metrics...")
    df = db.read_sql("SELECT * FROM cvm.metrics LIMIT 1")
    print("Columns:", df.columns.tolist())
    print("Count:", len(df))
except Exception as e:
    print(e)
