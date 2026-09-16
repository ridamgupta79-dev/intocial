from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.config import DATABASE_URL
from sqlalchemy.orm import declarative_base



engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

Base = declarative_base()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()