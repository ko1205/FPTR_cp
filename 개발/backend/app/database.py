"""SQLAlchemy 엔진/세션 설정.

DB는 설치형이 아니라 파일형 SQLite 를 사용한다.
경로: 개발/database/ftpr.db  (이 파일 기준 ../../database/ftpr.db)
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# backend/app/database.py -> backend/app -> backend -> 개발 -> database
# 호스팅(휘발 FS) 등에서는 FTPR_DB_DIR 로 쓰기 가능한 경로를 지정할 수 있다.
DB_DIR = Path(os.environ.get("FTPR_DB_DIR") or (Path(__file__).resolve().parents[2] / "database"))
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "ftpr.db"

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False : FastAPI 의 멀티스레드에서 SQLite 사용 허용
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI 의존성: 요청마다 세션 발급/정리."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
