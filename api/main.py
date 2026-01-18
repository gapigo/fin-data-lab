from fastapi import FastAPI, HTTPException, Query
from typing import List, Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

from models import FundSearchResponse, FundDetail, QuotaData, FundHistory
from service import DataService

app = FastAPI(title="Fin Data Lab API", description="API for CVM Fund Data")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = DataService()

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Fin Data Lab API is running"}

@app.get("/funds", response_model=List[FundSearchResponse])
def search_funds(
    q: Optional[str] = Query(None, description="Search term for fund name or CNPJ"),
    limit: int = Query(50, le=100)
):
    """
    Search for funds by name or CNPJ.
    """
    return service.search_funds(query=q, limit=limit)

@app.get("/funds/{cnpj}", response_model=FundDetail)
def get_fund_details(cnpj: str):
    """
    Get detailed information about a specific fund.
    """
    fund = service.get_fund_detail(cnpj)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund

@app.get("/funds/{cnpj}/history", response_model=List[QuotaData])
def get_fund_history(
    cnpj: str,
    start_date: Optional[date] = Query(None, description="Start date for history (YYYY-MM-DD)")
):
    """
    Get historical quota data for a fund (NAV, Net Worth, etc).
    """
    history = service.get_fund_history(cnpj, start_date)
    # Return empty list is valid if no data
    return history

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
