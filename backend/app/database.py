"""Conexão e sessão do SQLAlchemy para o banco SQLite.

Em produção (Fly.io), gravamos em /data/app.db no volume persistente.
Em dev (quando /data não existe), caímos para a raiz do backend.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = "/data" if os.path.isdir("/data") else os.path.join(os.path.dirname(__file__), "..")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "app.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False é necessário porque o FastAPI atende requests em
# threads diferentes — o default do SQLite rejeitaria esse uso.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
