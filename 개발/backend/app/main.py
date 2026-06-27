"""FTPR Copy — FastAPI 진입점.

원본 Flow Production Tracking 의 REST API 패턴을 모사한 프로토타입 서버.
SQLite 파일 DB(개발/database/ftpr.db)를 사용한다.

배포(단일 서비스): 빌드된 Vite SPA(dist)를 같은 오리진의 `/` 에서 서빙하고,
부팅 시 DB 가 비어 있으면 자동 시드한다(휘발 FS 데모용).
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import Base, SessionLocal, engine
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


def _seed_if_empty():
    """DB 가 비어 있으면(프로젝트 0건) 샘플 데이터를 시드한다.

    휘발 FS 무료 호스팅에서 컨테이너 재시작 시 데모 데이터를 자동 복구하기 위함.
    데이터가 이미 있으면(웜 재시작/로컬 개발) 건드리지 않는다.
    """
    db = SessionLocal()
    try:
        empty = db.query(models.Project).count() == 0
    except Exception:
        empty = True
    finally:
        db.close()
    if not empty:
        return
    try:
        import seed  # backend 루트의 seed.py (uvicorn 을 backend 디렉터리에서 실행)

        seed.main()
        print("[startup] DB 가 비어 있어 샘플 데이터를 시드했습니다.")
    except Exception as exc:  # 시드 실패해도 API 는 기동
        print(f"[startup] 자동 시드 실패: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_if_empty()
    yield


app = FastAPI(
    title="FTPR Copy API",
    description="Flow Production Tracking (구 ShotGrid/Shotgun) 기능 프로토타입 API",
    version="0.1.0",
    lifespan=lifespan,
)

# 프론트 분리 배포 시를 대비한 CORS(단일 서비스에선 동일 오리진이라 불필요하나 무해).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일(샘플 썸네일/미디어) 서빙: /static/thumbs/img_N.jpg, /static/media/vN.mp4
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


@app.get("/api")
def api_root():
    return {
        "app": "FTPR Copy API",
        "docs": "/docs",
        "product": "Flow Production Tracking prototype",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---- 빌드된 SPA 서빙 (단일 서비스 배포) ----
class SPAStaticFiles(StaticFiles):
    """클라이언트 라우팅(/inbox, /detail/... 등) 새로고침 시 index.html 로 폴백."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


# FRONTEND_DIST 미지정 시 개발/frontend/dist (로컬 빌드 결과) 사용.
# dist 가 없으면(순수 API 개발 모드) SPA 마운트를 건너뛴다.
_DIST = Path(os.environ.get("FRONTEND_DIST") or (Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if (_DIST / "index.html").exists():
    # 반드시 /api·/static 라우트 등록 이후, 마지막에 "/" 로 마운트.
    app.mount("/", SPAStaticFiles(directory=str(_DIST), html=True), name="spa")
