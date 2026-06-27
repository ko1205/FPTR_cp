"""FTPR Copy — FastAPI 진입점.

원본 Flow Production Tracking 의 REST API 패턴을 모사한 프로토타입 서버.
SQLite 파일 DB(개발/database/ftpr.db)를 사용한다.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import (
    activity,
    assets,
    custom_fields,
    masters,
    notes,
    playlists,
    projects,
    sequences,
    shots,
    tasks,
    versions,
)

# 모델 import 후 테이블 생성 (없으면 생성)
from . import models  # noqa: F401

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FTPR Copy API",
    description="Flow Production Tracking (구 ShotGrid/Shotgun) 기능 프로토타입 API",
    version="0.1.0",
)

# 프론트(Vite, 보통 :5173)에서의 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일(샘플 썸네일 이미지) 서빙: /static/thumbs/img_N.jpg
STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(masters.router)
app.include_router(projects.router)
app.include_router(sequences.router)
app.include_router(shots.router)
app.include_router(assets.router)
app.include_router(tasks.router)
app.include_router(versions.router)
app.include_router(notes.router)
app.include_router(playlists.router)
app.include_router(custom_fields.router)
app.include_router(activity.router)


@app.get("/")
def root():
    return {
        "app": "FTPR Copy API",
        "docs": "/docs",
        "product": "Flow Production Tracking prototype",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
