# FTPR Copy — 단일 서비스 배포용 멀티스테이지 이미지
# (FastAPI 가 /api + /static + 빌드된 Vite SPA(/) 를 동일 오리진에서 서빙)

# ---- 1) 프론트엔드 빌드 (Vite SPA) ----
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY "개발/frontend/package.json" "개발/frontend/package-lock.json" ./
RUN npm ci
COPY "개발/frontend/" ./
RUN npm run build      # -> /fe/dist

# ---- 2) 백엔드 런타임 (FastAPI) ----
FROM python:3.11-slim AS runtime
WORKDIR /app

# 파이썬 의존성
COPY "개발/backend/requirements.txt" ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스(app/, seed.py, static/ 포함)
COPY "개발/backend/" ./

# 빌드된 SPA 를 이미지에 포함
COPY --from=frontend /fe/dist ./frontend_dist

# 단일 서비스 + 휘발 FS 설정
ENV FRONTEND_DIST=/app/frontend_dist \
    FTPR_DB_DIR=/tmp/ftpr \
    PYTHONUNBUFFERED=1

# Render/Koyeb 등은 $PORT 를 주입 (없으면 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
