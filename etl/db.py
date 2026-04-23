"""
Conexão síncrona com o banco para o ETL.
O ETL roda fora do Docker, então usa porta 5435 (mapeada no docker-compose).
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    echo=False,
)

Session = sessionmaker(bind=engine)


def get_session():
    return Session()


def test_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            print(f"[db] Conectado: {result.scalar()}")
        return True
    except Exception as e:
        print(f"[db] ERRO de conexão: {e}")
        return False


if __name__ == "__main__":
    test_connection()
