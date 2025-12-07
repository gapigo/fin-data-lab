from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import funds
from app.db.database import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de inicialização e desligamento da aplicação."""
    print("Criando tabelas...")
    create_db_and_tables()
    print("Tabelas criadas!")
    yield


app = FastAPI(title="Fin Data Lab API", version="0.1.0", lifespan=lifespan)

# Inclui as rotas da API de fundos
app.include_router(funds.router)


@app.get("/", tags=["root"])
async def read_root():
    """Retorna uma mensagem de boas-vindas da API."""
    return {"message": "Bem-vindo à Fin Data Lab API!"}
