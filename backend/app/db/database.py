import os
from typing import Generator

from sqlmodel import Session, SQLModel, create_engine
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# Obtém a string de conexão do PostgreSQL das variáveis de ambiente
# Fallback para SQLite para desenvolvimento local se POSTGRES_URL não estiver definido
POSTGRES_URL = os.getenv("POSTGRES_URL")
if POSTGRES_URL:
    DATABASE_URL = POSTGRES_URL
else:
    DATABASE_URL = os.getenv("DATABASE_URL_SQLITE", "sqlite:///./fin_data_lab.db")

# Cria o SQLAlchemy engine
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    """Cria todas as tabelas no banco de dados com base nos modelos SQLModel."""
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    """
    Dependency para obter uma sessão de banco de dados.
    Esta sessão será fechada automaticamente após o uso.
    """
    with Session(engine) as session:
        yield session
