#!/usr/bin/env bash
# FTPR Copy 전체 기동 — 백엔드(FastAPI) + 프론트엔드(Vite) 동시 실행.
# 모든 의존성은 이 폴더 내부에만 설치된다 (venv / node_modules).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "================================================================"
echo " FTPR Copy  —  Flow Production Tracking 프로토타입"
echo "================================================================"

# ---- 백엔드 준비 ----
cd "$ROOT/개발/backend"
if [ ! -d venv ]; then
  echo "[backend] venv 생성 + 패키지 설치..."
  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip >/dev/null
  ./venv/bin/pip install -r requirements.txt
fi
if [ ! -f "$ROOT/개발/database/ftpr.db" ]; then
  echo "[backend] 샘플 데이터 시드..."
  ./venv/bin/python seed.py
fi

# ---- 프론트 준비 ----
cd "$ROOT/개발/frontend"
if [ ! -d node_modules ]; then
  echo "[frontend] npm install (로컬)..."
  npm install
fi

# ---- 동시 실행 ----
cd "$ROOT/개발/backend"
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACK_PID=$!

cd "$ROOT/개발/frontend"
npm run dev &
FRONT_PID=$!

echo "----------------------------------------------------------------"
echo " 백엔드 API : http://127.0.0.1:8000   (문서: /docs)"
echo " 프론트 UI  : http://localhost:5173"
echo " 종료: Ctrl+C"
echo "----------------------------------------------------------------"

trap "echo; echo '종료 중...'; kill $BACK_PID $FRONT_PID 2>/dev/null" INT TERM
wait
