from fastapi import APIRouter
from datetime import datetime
from config.postgresql import PostgresConnector

router = APIRouter()
db = PostgresConnector()

@router.get("/anomalies")
def get_anomalies():
    results = []

    # 1. Funds with > 3σ daily quota change
    df1 = db.read_sql("""
        WITH daily_changes AS (
            SELECT cnpj_fundo, dt_comptc, vl_quota,
                   LAG(vl_quota) OVER (PARTITION BY cnpj_fundo ORDER BY dt_comptc) as prev_quota
            FROM cvm.cotas
            WHERE dt_comptc >= CURRENT_DATE - INTERVAL '30 days'
        ),
        stats AS (
            SELECT cnpj_fundo,
                   AVG(ABS((vl_quota - prev_quota) / NULLIF(prev_quota, 0))) as avg_change,
                   STDDEV(ABS((vl_quota - prev_quota) / NULLIF(prev_quota, 0))) as std_change
            FROM daily_changes WHERE prev_quota IS NOT NULL
            GROUP BY cnpj_fundo
        )
        SELECT d.cnpj_fundo, c.denom_social,
               ABS((d.vl_quota - d.prev_quota) / NULLIF(d.prev_quota, 0)) as change_pct,
               s.avg_change, s.std_change
        FROM daily_changes d
        JOIN stats s ON s.cnpj_fundo = d.cnpj_fundo
        JOIN cvm.cadastro c ON c.cnpj_fundo = d.cnpj_fundo
        WHERE d.dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.cotas)
        AND ABS((d.vl_quota - d.prev_quota) / NULLIF(d.prev_quota, 0)) > (s.avg_change + 3 * s.std_change)
        AND s.std_change > 0
        ORDER BY change_pct DESC
        LIMIT 20
    """)
    for _, row in df1.iterrows():
        results.append({
            "type": "quota_spike",
            "severity": "high",
            "cnpj": row['cnpj_fundo'],
            "name": row['denom_social'],
            "description": f"Variação de cota anormal: {row['change_pct']:.1%} (>3σ da média)"
        })

    # 2. Recently registered funds (last 7 days)
    df2 = db.read_sql("""
        SELECT cnpj_fundo, denom_social, dt_reg
        FROM cvm.cadastro
        WHERE dt_reg >= CURRENT_DATE - INTERVAL '7 days'
        AND sit = 'EM FUNCIONAMENTO NORMAL'
        ORDER BY dt_reg DESC
        LIMIT 10
    """)
    for _, row in df2.iterrows():
        results.append({
            "type": "new_fund",
            "severity": "info",
            "cnpj": row['cnpj_fundo'],
            "name": row['denom_social'],
            "description": f"Novo fundo registrado em {row['dt_reg']}"
        })

    return {"anomalies": results, "generated_at": datetime.now().isoformat()}
