import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base


# --------------------------------------------------
# Load environment variables from .env
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# PostgreSQL Configuration
# --------------------------------------------------

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sif_sanket")


# --------------------------------------------------
# Validate configuration
# --------------------------------------------------

if not DB_USER:
    raise RuntimeError("DB_USER is not set in .env")

if not DB_PASSWORD:
    raise RuntimeError("DB_PASSWORD is not set in .env")


# --------------------------------------------------
# Create PostgreSQL URL safely
# --------------------------------------------------

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME,
)


# --------------------------------------------------
# SQLAlchemy Engine
# --------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# --------------------------------------------------
# Database Session
# --------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# --------------------------------------------------
# Base Model
# --------------------------------------------------

Base = declarative_base()


# --------------------------------------------------
# FastAPI Database Dependency
# --------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# Database Connection Test
# --------------------------------------------------

def test_database_connection():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        )

        return result.scalar()