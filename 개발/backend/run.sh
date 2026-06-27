#!/usr/bin/env bash
# 백엔드(FastAPI) 실행 — venv 격리, SQLite 파일 DB 사용
set -e
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "[setup] venv 생성..."
  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt
fi

# DB가 없으면 시드
if [ ! -f ../database/ftpr.db ]; then
  echo "[setup] 샘플 데이터 시드..."
  ./venv/bin/python seed.py
fi

echo "[run] http://127.0.0.1:8000  (docs: /docs)"
exec ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
